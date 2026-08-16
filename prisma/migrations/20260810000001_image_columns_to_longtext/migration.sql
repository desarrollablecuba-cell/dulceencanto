-- ============================================================================
-- Migración CRÍTICA: convertir columnas `image` de VARCHAR(191) a LONGTEXT
--
-- PROBLEMA: Las imágenes subidas desde el Admin se guardan como data URLs
-- (base64 WebP) que pesan 50-200KB de texto. Pero `image` era VARCHAR(191)
-- en MySQL, así que se TRUNCABAN a 191 caracteres al guardar.
--   - Admin preview: funcionaba (muestra el data URL en memoria, no de la BD)
--   - Página del cliente: NO cargaba (leía el data URL truncado de la BD)
--
-- AFECTA: Category, Product, VariantOption, ProductCombination, OrderItem
--
-- CÓMO USAR (Hostinger):
-- 1. hPanel → Bases de datos → phpMyAdmin
-- 2. Selecciona la BD de enviosdiazpremium
-- 3. Pestaña "SQL" → pega este contenido → "Continuar"
-- 4. Si alguna columna ya es LONGTEXT, verás un warning — ignóralo.
--
-- NOTA: Esta migración NO recupera las imágenes ya truncadas (esas se perdieron
-- al guardar). Después de correr este SQL, hay que volver a subir las imágenes
-- desde el Admin. Pero a partir de ahora sí se guardarán completas.
-- ============================================================================

ALTER TABLE `Category`
  MODIFY COLUMN `image` LONGTEXT NOT NULL;

ALTER TABLE `Product`
  MODIFY COLUMN `image` LONGTEXT NOT NULL;

ALTER TABLE `VariantOption`
  MODIFY COLUMN `image` LONGTEXT NOT NULL;

ALTER TABLE `ProductCombination`
  MODIFY COLUMN `image` LONGTEXT NOT NULL;

ALTER TABLE `OrderItem`
  MODIFY COLUMN `image` LONGTEXT NOT NULL;
