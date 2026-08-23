-- CreateTable
CREATE TABLE IF NOT EXISTS `Category` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NOT NULL DEFAULT '',
    `image` VARCHAR(191) NOT NULL DEFAULT '',
    `order` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` VARCHAR(191) NOT NULL DEFAULT '',
    `updatedAt` VARCHAR(191) NOT NULL DEFAULT '',

    UNIQUE INDEX `Category_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Product` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `shortName` VARCHAR(191) NOT NULL DEFAULT '',
    `description` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NOT NULL DEFAULT '',
    `price` DOUBLE NOT NULL DEFAULT 0,
    `image` VARCHAR(191) NOT NULL DEFAULT '',
    `images` LONGTEXT NOT NULL DEFAULT '[]',
    `tags` LONGTEXT NOT NULL DEFAULT '[]',
    `categoryId` VARCHAR(191) NOT NULL DEFAULT '',
    `rating` DOUBLE NOT NULL DEFAULT 0,
    `reviewCount` INTEGER NOT NULL DEFAULT 0,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL DEFAULT 0,
    `saleUnit` VARCHAR(191) NOT NULL DEFAULT 'unidad',
    `barcode` VARCHAR(191) NOT NULL DEFAULT '',
    `productType` VARCHAR(191) NOT NULL DEFAULT 'elaborado',
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `posAvailable` BOOLEAN NOT NULL DEFAULT true,
    `tiendaAvailable` BOOLEAN NOT NULL DEFAULT true,
    `advanceType` VARCHAR(191) NOT NULL DEFAULT 'sin',
    `advanceValue` DOUBLE NOT NULL DEFAULT 0,
    `minHours` INTEGER NOT NULL DEFAULT 24,
    `minHoursUnit` VARCHAR(191) NOT NULL DEFAULT 'horas',
    `costPrice` DOUBLE NOT NULL DEFAULT 0,
    `marginPercent` DOUBLE NOT NULL DEFAULT 0,
    `offerEnabled` BOOLEAN NOT NULL DEFAULT false,
    `offerType` VARCHAR(191) NOT NULL DEFAULT 'permanente',
    `offerPrice` DOUBLE NOT NULL DEFAULT 0,
    `offerStart` VARCHAR(191) NULL,
    `offerEnd` VARCHAR(191) NULL,
    `wholesaleEnabled` BOOLEAN NOT NULL DEFAULT false,
    `wholesalePrice` DOUBLE NOT NULL DEFAULT 0,
    `wholesaleMinQty` INTEGER NOT NULL DEFAULT 0,
    `reservationEnabled` BOOLEAN NOT NULL DEFAULT false,
    `maxReservations` INTEGER NOT NULL DEFAULT 0,
    `reservationDays` INTEGER NOT NULL DEFAULT 0,
    `reservationDeposit` DOUBLE NOT NULL DEFAULT 0,
    `promoEnabled` BOOLEAN NOT NULL DEFAULT false,
    `promoType` VARCHAR(191) NOT NULL DEFAULT 'discount',
    `promoValue` DOUBLE NOT NULL DEFAULT 0,
    `promoBuyQty` INTEGER NOT NULL DEFAULT 0,
    `promoGetQty` INTEGER NOT NULL DEFAULT 0,
    `promoStart` VARCHAR(191) NULL,
    `promoEnd` VARCHAR(191) NULL,
    `createdAt` VARCHAR(191) NOT NULL DEFAULT '',
    `updatedAt` VARCHAR(191) NOT NULL DEFAULT '',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `WholesaleTier` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL DEFAULT '',
    `minQty` INTEGER NOT NULL DEFAULT 0,
    `maxQty` INTEGER NOT NULL DEFAULT 0,
    `price` DOUBLE NOT NULL DEFAULT 0,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` VARCHAR(191) NOT NULL DEFAULT '',
    `updatedAt` VARCHAR(191) NOT NULL DEFAULT '',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `VariantGroup` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL DEFAULT '',
    `required` BOOLEAN NOT NULL DEFAULT false,
    `maxSelect` INTEGER NOT NULL DEFAULT 1,
    `isImageGroup` BOOLEAN NOT NULL DEFAULT false,
    `isDominant` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` VARCHAR(191) NOT NULL DEFAULT '',
    `updatedAt` VARCHAR(191) NOT NULL DEFAULT '',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `VariantOption` (
    `id` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL DEFAULT '',
    `priceMod` DOUBLE NOT NULL DEFAULT 0,
    `image` VARCHAR(191) NOT NULL DEFAULT '',
    `stock` INTEGER NOT NULL DEFAULT 0,
    `available` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` VARCHAR(191) NOT NULL DEFAULT '',
    `updatedAt` VARCHAR(191) NOT NULL DEFAULT '',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ProductCombination` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `optionIds` VARCHAR(191) NOT NULL DEFAULT '[]',
    `sku` VARCHAR(191) NOT NULL DEFAULT '',
    `stock` INTEGER NOT NULL DEFAULT 0,
    `price` DOUBLE NULL,
    `image` VARCHAR(191) NOT NULL DEFAULT '',
    `available` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` VARCHAR(191) NOT NULL DEFAULT '',
    `updatedAt` VARCHAR(191) NOT NULL DEFAULT '',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ProductExtra` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL DEFAULT '',
    `description` VARCHAR(191) NOT NULL,
    `priceMod` DOUBLE NOT NULL DEFAULT 0,
    `required` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` VARCHAR(191) NOT NULL DEFAULT '',
    `updatedAt` VARCHAR(191) NOT NULL DEFAULT '',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Order` (
    `id` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(191) NOT NULL DEFAULT '',
    `customerName` VARCHAR(191) NOT NULL DEFAULT '',
    `customerEmail` VARCHAR(191) NOT NULL DEFAULT '',
    `customerPhone` VARCHAR(191) NOT NULL DEFAULT '',
    `address` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL DEFAULT '',
    `state` VARCHAR(191) NOT NULL DEFAULT '',
    `zipCode` VARCHAR(191) NOT NULL DEFAULT '',
    `recipientName` VARCHAR(191) NOT NULL DEFAULT '',
    `recipientPhone` VARCHAR(191) NOT NULL DEFAULT '',
    `recipientAddress` VARCHAR(191) NOT NULL,
    `recipientCity` VARCHAR(191) NOT NULL DEFAULT '',
    `recipientNotes` VARCHAR(191) NOT NULL,
    `deliveryZoneId` VARCHAR(191) NULL,
    `deliveryZoneName` VARCHAR(191) NULL,
    `deliveryZonePrice` DOUBLE NOT NULL DEFAULT 0,
    `deliveryDate` VARCHAR(191) NULL,
    `deliveryTimeSlot` VARCHAR(191) NOT NULL DEFAULT 'normal',
    `asapTimeSlot` VARCHAR(191) NULL,
    `deliverySurcharge` DOUBLE NOT NULL DEFAULT 0,
    `shippingCost` DOUBLE NOT NULL DEFAULT 0,
    `total` DOUBLE NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `isPaid` BOOLEAN NOT NULL DEFAULT false,
    `zelleRef` VARCHAR(191) NULL,
    `paymentProof` VARCHAR(191) NULL,
    `createdAt` VARCHAR(191) NOT NULL DEFAULT '',
    `updatedAt` VARCHAR(191) NOT NULL DEFAULT '',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `OrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL DEFAULT '',
    `name` VARCHAR(191) NOT NULL DEFAULT '',
    `price` DOUBLE NOT NULL DEFAULT 0,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `image` VARCHAR(191) NOT NULL DEFAULT '',
    `variantInfo` LONGTEXT NOT NULL DEFAULT '[]',
    `extrasInfo` LONGTEXT NOT NULL DEFAULT '[]',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Admin` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL DEFAULT '',
    `name` VARCHAR(191) NOT NULL DEFAULT '',
    `createdAt` VARCHAR(191) NOT NULL DEFAULT '',
    `updatedAt` VARCHAR(191) NOT NULL DEFAULT '',

    UNIQUE INDEX `Admin_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL DEFAULT '',
    `phone` VARCHAR(191) NOT NULL DEFAULT '',
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL DEFAULT '',
    `country` VARCHAR(191) NOT NULL DEFAULT 'US',
    `address` VARCHAR(191) NOT NULL,
    `deliveryZoneId` VARCHAR(191) NULL,
    `deliveryZoneName` VARCHAR(191) NULL,
    `savedRecipients` LONGTEXT NOT NULL DEFAULT '[]',
    `createdAt` VARCHAR(191) NOT NULL DEFAULT '',
    `updatedAt` VARCHAR(191) NOT NULL DEFAULT '',

    UNIQUE INDEX `Customer_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Review` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL DEFAULT '',
    `customerId` VARCHAR(191) NULL,
    `authorName` VARCHAR(191) NOT NULL DEFAULT '',
    `rating` INTEGER NOT NULL DEFAULT 5,
    `comment` LONGTEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `adminReply` LONGTEXT NOT NULL,
    `createdAt` VARCHAR(191) NOT NULL DEFAULT '',
    `updatedAt` VARCHAR(191) NOT NULL DEFAULT '',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `DeliveryZone` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL DEFAULT '',
    `description` VARCHAR(191) NOT NULL,
    `price` DOUBLE NOT NULL DEFAULT 0,
    `estimatedTime` VARCHAR(191) NOT NULL DEFAULT '',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `order` INTEGER NOT NULL DEFAULT 0,
    `allowsPriorityDelivery` BOOLEAN NOT NULL DEFAULT false,
    `asapSurchargeOverride` BOOLEAN NOT NULL DEFAULT false,
    `asapSurchargeType` VARCHAR(191) NOT NULL DEFAULT 'fixed',
    `asapSurchargeValue` DOUBLE NOT NULL DEFAULT 0,
    `asapMinLeadTimeOverride` INTEGER NULL,
    `asapMaxPerHourOverride` INTEGER NULL,
    `asapExcludeNormalHoursOverride` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` VARCHAR(191) NOT NULL DEFAULT '',
    `updatedAt` VARCHAR(191) NOT NULL DEFAULT '',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `SiteConfig` (
    `id` VARCHAR(191) NOT NULL,
    `storeName` VARCHAR(191) NOT NULL DEFAULT 'Mi Tienda',
    `tagline` VARCHAR(191) NOT NULL DEFAULT '',
    `logo` VARCHAR(191) NOT NULL DEFAULT '',
    `cover` VARCHAR(191) NOT NULL DEFAULT '',
    `heroTitle` VARCHAR(191) NOT NULL DEFAULT '',
    `heroSubtitle` VARCHAR(191) NOT NULL DEFAULT '',
    `heroSlides` LONGTEXT NOT NULL DEFAULT '',
    `promoBannerTitle` VARCHAR(191) NOT NULL DEFAULT '',
    `promoBannerSubtitle` VARCHAR(191) NOT NULL DEFAULT '',
    `promoBannerButtonText` VARCHAR(191) NOT NULL DEFAULT '',
    `reservableDeliverySchedule` VARCHAR(191) NOT NULL DEFAULT '',
    `priorityDeliveryInfo1` VARCHAR(191) NOT NULL DEFAULT '',
    `priorityDeliveryInfo2` VARCHAR(191) NOT NULL DEFAULT '',
    `priorityDeliveryInfo3` VARCHAR(191) NOT NULL DEFAULT '',
    `phone` VARCHAR(191) NOT NULL DEFAULT '',
    `whatsappNumber` VARCHAR(191) NOT NULL DEFAULT '',
    `address` VARCHAR(191) NOT NULL,
    `zelleEmail` VARCHAR(191) NOT NULL DEFAULT '',
    `zelleName` VARCHAR(191) NOT NULL DEFAULT '',
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#f59e0b',
    `primaryColorDark` VARCHAR(191) NOT NULL DEFAULT '#d97706',
    `primaryColorLight` VARCHAR(191) NOT NULL DEFAULT '#fef3c7',
    `footerBgColor` VARCHAR(191) NOT NULL DEFAULT '#111827',
    `footerTextColor` VARCHAR(191) NOT NULL DEFAULT '#d1d5db',
    `footerAccentColor` VARCHAR(191) NOT NULL DEFAULT '#f59e0b',
    `themeId` VARCHAR(191) NOT NULL DEFAULT 'diaz-premium',
    `themeData` LONGTEXT NOT NULL,
    `homeSectionsOrder` LONGTEXT NOT NULL,
    `homeSectionsEnabled` LONGTEXT NOT NULL,
    `offersCarousel` LONGTEXT NOT NULL,
    `savedThemes` LONGTEXT NOT NULL,
    `zelleEnabled` BOOLEAN NOT NULL DEFAULT true,
    `freeShippingEnabled` BOOLEAN NOT NULL DEFAULT true,
    `customerRegistrationEnabled` BOOLEAN NOT NULL DEFAULT true,
    `customerLoginEnabled` BOOLEAN NOT NULL DEFAULT true,
    `tickerEnabled` BOOLEAN NOT NULL DEFAULT true,
    `catalogLayout` VARCHAR(191) NOT NULL DEFAULT 'categories',
    `freeShippingMin` DOUBLE NOT NULL DEFAULT 100,
    `shippingCost` DOUBLE NOT NULL DEFAULT 9.99,
    `minOrderAmount` DOUBLE NOT NULL DEFAULT 10,
    `scheduleLunes` VARCHAR(191) NOT NULL DEFAULT '15:00 - 18:00',
    `scheduleMartes` VARCHAR(191) NOT NULL DEFAULT '15:00 - 18:00',
    `scheduleMiercoles` VARCHAR(191) NOT NULL DEFAULT '15:00 - 18:00',
    `scheduleJueves` VARCHAR(191) NOT NULL DEFAULT '15:00 - 18:00',
    `scheduleViernes` VARCHAR(191) NOT NULL DEFAULT '15:00 - 18:00',
    `scheduleSabado` VARCHAR(191) NOT NULL DEFAULT '15:00 - 18:00',
    `scheduleDomingo` VARCHAR(191) NOT NULL DEFAULT '15:00 - 18:00',
    `asapSurchargeType` VARCHAR(191) NOT NULL DEFAULT 'fixed',
    `asapSurchargeValue` DOUBLE NOT NULL DEFAULT 5,
    `asapStartHour` VARCHAR(191) NOT NULL DEFAULT '06:00',
    `asapEndHour` VARCHAR(191) NOT NULL DEFAULT '22:00',
    `maxOrderHour` VARCHAR(191) NOT NULL DEFAULT '14:00',
    `asapMinLeadTime` INTEGER NOT NULL DEFAULT 60,
    `asapMaxPerHour` INTEGER NOT NULL DEFAULT 5,
    `asapExcludeNormalHours` BOOLEAN NOT NULL DEFAULT false,
    `normalSchedule` VARCHAR(191) NOT NULL DEFAULT '15:00 - 18:00',
    `activeCountries` VARCHAR(191) NOT NULL DEFAULT 'US,CU',
    `tickerItems` LONGTEXT NOT NULL,
    `horarioSectionTitle` VARCHAR(191) NOT NULL DEFAULT '',
    `horarioSectionDesc` VARCHAR(191) NOT NULL,
    `horarioCards` LONGTEXT NOT NULL,
    `socialLinks` LONGTEXT NOT NULL,
    `trustBadges` LONGTEXT NOT NULL,
    `socialStats` LONGTEXT NOT NULL,
    `testimonials` LONGTEXT NOT NULL,
    `homeBenefits` LONGTEXT NOT NULL,
    `howItWorksSteps` LONGTEXT NOT NULL DEFAULT '',
    `navSections` LONGTEXT NOT NULL DEFAULT '',
    `hamburgerItems` LONGTEXT NOT NULL DEFAULT '',
    `createdAt` VARCHAR(191) NOT NULL DEFAULT '',
    `updatedAt` VARCHAR(191) NOT NULL DEFAULT '',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Service` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NOT NULL DEFAULT '',
    `image` VARCHAR(191) NOT NULL DEFAULT '',
    `price` DOUBLE NOT NULL DEFAULT 0,
    `priceUsd` DOUBLE NOT NULL DEFAULT 0,
    `category` VARCHAR(191) NOT NULL DEFAULT '',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` VARCHAR(191) NOT NULL DEFAULT '',
    `updatedAt` VARCHAR(191) NOT NULL DEFAULT '',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `EventReservation` (
    `id` VARCHAR(191) NOT NULL,
    `reservationCode` VARCHAR(191) NOT NULL DEFAULT '',
    `eventType` VARCHAR(191) NOT NULL DEFAULT '',
    `eventDate` VARCHAR(191) NOT NULL DEFAULT '',
    `eventTime` VARCHAR(191) NOT NULL DEFAULT '',
    `customerName` VARCHAR(191) NOT NULL DEFAULT '',
    `customerEmail` VARCHAR(191) NOT NULL DEFAULT '',
    `customerPhone` VARCHAR(191) NOT NULL DEFAULT '',
    `guestCount` INTEGER NOT NULL DEFAULT 0,
    `budget` DOUBLE NOT NULL DEFAULT 0,
    `paymentMethod` VARCHAR(191) NOT NULL DEFAULT '',
    `notes` LONGTEXT NOT NULL DEFAULT '',
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `totalCup` DOUBLE NOT NULL DEFAULT 0,
    `totalUsd` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` VARCHAR(191) NOT NULL DEFAULT '',
    `updatedAt` VARCHAR(191) NOT NULL DEFAULT '',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `EventReservationItem` (
    `id` VARCHAR(191) NOT NULL,
    `reservationId` VARCHAR(191) NOT NULL,
    `itemType` VARCHAR(191) NOT NULL DEFAULT '',
    `itemId` VARCHAR(191) NOT NULL DEFAULT '',
    `name` VARCHAR(191) NOT NULL DEFAULT '',
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `priceCup` DOUBLE NOT NULL DEFAULT 0,
    `priceUsd` DOUBLE NOT NULL DEFAULT 0,
    `notes` VARCHAR(191) NOT NULL DEFAULT '',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Promotion` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `image` VARCHAR(191) NOT NULL DEFAULT '',
    `occasion` VARCHAR(191) NOT NULL DEFAULT '',
    `discountPct` DOUBLE NOT NULL DEFAULT 0,
    `startDate` VARCHAR(191) NOT NULL DEFAULT '',
    `endDate` VARCHAR(191) NOT NULL DEFAULT '',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` VARCHAR(191) NOT NULL DEFAULT '',
    `updatedAt` VARCHAR(191) NOT NULL DEFAULT '',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `GalleryItem` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `image` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL DEFAULT '',
    `description` VARCHAR(191) NOT NULL DEFAULT '',
    `order` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` VARCHAR(191) NOT NULL DEFAULT '',
    `updatedAt` VARCHAR(191) NOT NULL DEFAULT '',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WholesaleTier` ADD CONSTRAINT `WholesaleTier_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VariantGroup` ADD CONSTRAINT `VariantGroup_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VariantOption` ADD CONSTRAINT `VariantOption_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `VariantGroup`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductCombination` ADD CONSTRAINT `ProductCombination_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductExtra` ADD CONSTRAINT `ProductExtra_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventReservationItem` ADD CONSTRAINT `EventReservationItem_reservationId_fkey` FOREIGN KEY (`reservationId`) REFERENCES `EventReservation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

