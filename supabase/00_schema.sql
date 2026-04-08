-- ============================================================
-- ZUQUIX PMS — Base Schema
-- Run this once on a fresh Supabase project.
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";


-- ============================================================
-- HOSTELS (tenant root — referenced by profiles)
-- ============================================================
create table if not exists hostels (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    created_at  timestamptz not null default now()
);


-- ============================================================
-- PROFILES (one row per auth user)
-- ============================================================
create table if not exists profiles (
    id          uuid primary key references auth.users(id) on delete cascade,
    email       text,
    full_name   text,
    role        text not null default 'staff',   -- 'admin' | 'staff'
    hostel_id   uuid references hostels(id),
    created_at  timestamptz not null default now()
);

-- Automatically create a profile row when a new user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
    insert into profiles (id, email, full_name)
    values (new.id, new.email, new.raw_user_meta_data->>'full_name');
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure handle_new_user();


-- ============================================================
-- ROOMS
-- ============================================================
create table if not exists rooms (
    id              uuid primary key default gen_random_uuid(),
    hostel_id       uuid references hostels(id),
    number          text not null,               -- e.g. '101', 'Dorm A'
    name            text,                        -- friendly label
    type            text not null default 'dormitory',  -- 'dormitory' | 'private'
    capacity_total  int  not null default 1,
    status          text not null default 'available',  -- 'available' | 'occupied' | 'dirty' | 'maintenance'
    created_at      timestamptz not null default now()
);

create index if not exists rooms_hostel_id_idx on rooms(hostel_id);


-- ============================================================
-- BEDS
-- ============================================================
create table if not exists beds (
    id          uuid primary key default gen_random_uuid(),
    room_id     uuid not null references rooms(id) on delete cascade,
    bed_number  text not null,                  -- e.g. '1', '2A'
    status      text not null default 'available',  -- 'available' | 'occupied' | 'dirty' | 'maintenance'
    created_at  timestamptz not null default now()
);

create index if not exists beds_room_id_idx on beds(room_id);


-- ============================================================
-- GUESTS
-- ============================================================
create table if not exists guests (
    id          uuid primary key default gen_random_uuid(),
    hostel_id   uuid references hostels(id),
    full_name   text not null,
    email       text,
    nationality text,
    photo_url   text,
    notes       text,
    created_at  timestamptz not null default now()
);

create index if not exists guests_hostel_id_idx on guests(hostel_id);


-- ============================================================
-- RESERVATIONS
-- ============================================================
create table if not exists reservations (
    id              uuid primary key default gen_random_uuid(),
    hostel_id       uuid references hostels(id),
    guest_id        uuid references guests(id),
    room_id         uuid references rooms(id),
    bed_id          uuid references beds(id),
    check_in_date   date not null,
    check_out_date  date not null,
    total_amount    numeric(10,2) not null default 0,
    amount_paid     numeric(10,2) not null default 0,
    balance_due     numeric(10,2) generated always as (total_amount - amount_paid) stored,
    status          text not null default 'pending',        -- 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'
    payment_status  text not null default 'pending',        -- 'pending' | 'partial' | 'paid'
    source          text,                                   -- 'walk_in' | 'booking.com' | 'airbnb' | etc.
    notes           text,
    created_by      uuid references auth.users(id),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz,
    deleted_at      timestamptz                             -- soft-delete
);

create index if not exists reservations_hostel_id_idx       on reservations(hostel_id);
create index if not exists reservations_check_in_date_idx   on reservations(check_in_date);
create index if not exists reservations_check_out_date_idx  on reservations(check_out_date);
create index if not exists reservations_status_idx          on reservations(status);
create index if not exists reservations_deleted_at_idx      on reservations(deleted_at);


-- ============================================================
-- PAYMENTS  (one or many per reservation)
-- ============================================================
create table if not exists payments (
    id              uuid primary key default gen_random_uuid(),
    reservation_id  uuid not null references reservations(id) on delete cascade,
    amount          numeric(10,2) not null,
    payment_method  text not null default 'cash',   -- 'cash' | 'card' | 'transfer' | 'other'
    payment_type    text,                           -- 'deposit' | 'full' | 'partial' | 'refund'
    receipt_url     text,
    notes           text,
    created_by      uuid references auth.users(id),
    created_at      timestamptz not null default now()
);

create index if not exists payments_reservation_id_idx on payments(reservation_id);

-- Trigger: update reservations.amount_paid after every payment insert/delete/update
create or replace function sync_amount_paid()
returns trigger language plpgsql as $$
declare
    v_reservation_id uuid;
    v_total          numeric(10,2);
begin
    v_reservation_id := coalesce(new.reservation_id, old.reservation_id);

    select coalesce(sum(amount), 0)
    into   v_total
    from   payments
    where  reservation_id = v_reservation_id;

    update reservations
    set    amount_paid    = v_total,
           payment_status = case
                               when v_total = 0                then 'pending'
                               when v_total < total_amount     then 'partial'
                               else 'paid'
                            end,
           updated_at     = now()
    where  id = v_reservation_id;

    return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_amount_paid on payments;
create trigger trg_sync_amount_paid
    after insert or update or delete on payments
    for each row execute procedure sync_amount_paid();


-- ============================================================
-- TRANSACTIONS  (accounting ledger)
-- ============================================================
create table if not exists transactions (
    id              uuid primary key default gen_random_uuid(),
    hostel_id       uuid references hostels(id),
    type            text not null,              -- 'income' | 'expense'
    category        text,                       -- 'manual_entry' | 'reservation' | 'cash_adjustment' | 'other'
    amount          numeric(10,2) not null,
    payment_method  text default 'cash',        -- 'cash' | 'card' | 'transfer' | 'other'
    description     text,
    reservation_id  uuid references reservations(id),
    auto_cash       boolean not null default false,  -- set by trigger, not manual
    shift_date      date,
    created_by      uuid references auth.users(id),
    created_at      timestamptz not null default now(),
    deleted_at      timestamptz                 -- soft-delete
);

create index if not exists transactions_hostel_id_idx    on transactions(hostel_id);
create index if not exists transactions_shift_date_idx   on transactions(shift_date);
create index if not exists transactions_created_at_idx   on transactions(created_at);
create index if not exists transactions_deleted_at_idx   on transactions(deleted_at);

-- Trigger: automatically create a cash-register income transaction when a payment is inserted
create or replace function create_transaction_from_payment()
returns trigger language plpgsql security definer as $$
declare
    v_hostel_id  uuid;
    v_user_id    uuid;
begin
    select hostel_id, created_by
    into   v_hostel_id, v_user_id
    from   reservations
    where  id = new.reservation_id;

    if new.payment_method = 'cash' then
        insert into transactions (
            hostel_id, type, category, amount, payment_method,
            description, reservation_id, auto_cash, shift_date, created_by, created_at
        ) values (
            v_hostel_id,
            'income',
            'reservation',
            new.amount,
            'cash',
            'Pago de reserva',
            new.reservation_id,
            true,
            current_date,
            coalesce(new.created_by, v_user_id),
            now()
        );
    end if;

    return new;
end;
$$;

drop trigger if exists trg_create_transaction_from_payment on payments;
create trigger trg_create_transaction_from_payment
    after insert on payments
    for each row execute procedure create_transaction_from_payment();


-- ============================================================
-- CASH_REGISTER  (running cash balance log)
-- ============================================================
create table if not exists cash_register (
    id               uuid primary key default gen_random_uuid(),
    hostel_id        uuid references hostels(id),
    previous_balance numeric(10,2) not null default 0,
    new_balance      numeric(10,2) not null default 0,
    difference       numeric(10,2) not null default 0,
    reason           text,
    adjusted_by      uuid references auth.users(id),
    created_at       timestamptz not null default now()
);

create index if not exists cash_register_hostel_id_idx  on cash_register(hostel_id);
create index if not exists cash_register_created_at_idx on cash_register(created_at);


-- ============================================================
-- TASKS  (housekeeping / maintenance)
-- ============================================================
create table if not exists tasks (
    id                 uuid primary key default gen_random_uuid(),
    hostel_id          uuid references hostels(id),
    title              text not null,
    description        text,
    type               text,                           -- 'cleaning' | 'maintenance' | 'other'
    priority           int  not null default 1,        -- higher = more urgent
    status             text not null default 'pending',-- 'pending' | 'completed'
    due_date           date,
    room_id            uuid references rooms(id),
    assigned_to        uuid references auth.users(id),
    assigned_to_name   text,
    completed_by       uuid references auth.users(id),
    completed_by_name  text,
    completed_at       timestamptz,
    created_by         uuid references auth.users(id),
    created_at         timestamptz not null default now()
);

create index if not exists tasks_hostel_id_idx on tasks(hostel_id);
create index if not exists tasks_status_idx    on tasks(status);
create index if not exists tasks_due_date_idx  on tasks(due_date);


-- ============================================================
-- ROW-LEVEL SECURITY  (multi-tenant isolation)
-- ============================================================

alter table hostels        enable row level security;
alter table profiles       enable row level security;
alter table rooms          enable row level security;
alter table beds           enable row level security;
alter table guests         enable row level security;
alter table reservations   enable row level security;
alter table payments       enable row level security;
alter table transactions   enable row level security;
alter table cash_register  enable row level security;
alter table tasks          enable row level security;

-- Helper: current user's hostel_id
create or replace function my_hostel_id()
returns uuid language sql stable security definer as $$
    select hostel_id from profiles where id = auth.uid();
$$;

-- PROFILES: each user sees only their own row
create policy "profiles: own row"    on profiles   for all using (id = auth.uid());

-- All other tables: users see only rows belonging to their hostel
create policy "rooms: own hostel"         on rooms          for all using (hostel_id = my_hostel_id());
create policy "beds: own hostel (room)"   on beds           for all using (room_id in (select id from rooms where hostel_id = my_hostel_id()));
create policy "guests: own hostel"        on guests         for all using (hostel_id = my_hostel_id());
create policy "reservations: own hostel"  on reservations   for all using (hostel_id = my_hostel_id());
create policy "payments: own hostel"      on payments       for all using (reservation_id in (select id from reservations where hostel_id = my_hostel_id()));
create policy "transactions: own hostel"  on transactions   for all using (hostel_id = my_hostel_id());
create policy "cash_register: own hostel" on cash_register  for all using (hostel_id = my_hostel_id());
create policy "tasks: own hostel"         on tasks          for all using (hostel_id = my_hostel_id());
create policy "hostels: own row"          on hostels        for all using (id = my_hostel_id());
