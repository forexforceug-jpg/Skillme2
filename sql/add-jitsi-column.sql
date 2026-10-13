alter table public.bookings
  add column if not exists jitsi_room_url text;

create index if not exists idx_bookings_jitsi on public.bookings(id) where jitsi_room_url is not null;
