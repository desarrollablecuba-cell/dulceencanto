-- ============================================================================
-- Migración: añadir heroTitle y heroSubtitle a SiteConfig
-- Permite editar el título y subtítulo del Hero desde el Admin Panel.
--
-- CÓMO USAR:
-- 1. Entra a hPanel de Hostinger → Bases de datos → phpMyAdmin
-- 2. Selecciona la BD de enviosdiazpremium
-- 3. Pestaña "SQL" → pega este contenido → "Continuar"
-- 4. Si alguna columna ya existe, verás un error "Duplicate column name" —
--    es INOFENSIVO, ignóralo y continúa con la siguiente.
-- ============================================================================

ALTER TABLE `SiteConfig`
  ADD COLUMN `heroTitle` VARCHAR(500) NOT NULL DEFAULT '';

ALTER TABLE `SiteConfig`
  ADD COLUMN `heroSubtitle` VARCHAR(500) NOT NULL DEFAULT '';
