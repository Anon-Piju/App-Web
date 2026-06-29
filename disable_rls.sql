-- Desactiva RLS en todas las tablas para uso local sin autenticación
-- (cuando añadas login de usuario, esto cambia)

alter table tasks          disable row level security;
alter table workouts       disable row level security;
alter table workout_sets   disable row level security;
alter table nutrition_logs disable row level security;
alter table investments    disable row level security;
alter table transactions   disable row level security;
alter table habits         disable row level security;
alter table habit_logs     disable row level security;
