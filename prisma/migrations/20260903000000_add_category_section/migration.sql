-- Añade la sección de la tienda a cada categoría (configurable desde el admin).
--   'ambas'       → Venta Directa y Reservas (decide el flag del producto)
--   'immediate'   → solo en Venta Directa (se paga en CUP)
--   'reservation' → solo en Reservas / Por Encargo
ALTER TABLE `Category` ADD COLUMN `section` VARCHAR(191) NOT NULL DEFAULT 'ambas';
