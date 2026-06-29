-- Añade columna sort_order a tasks para drag & drop persistente
alter table tasks add column if not exists sort_order integer default 0;

-- Inicializa sort_order con el orden actual por created_at
update tasks set sort_order = sub.rn
from (
  select id, row_number() over (order by created_at desc) as rn from tasks
) sub
where tasks.id = sub.id;
