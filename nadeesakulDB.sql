-- Run this file inside your selected database.
-- Railway MySQL provides the database name in MYSQLDATABASE, so do not switch databases here.

-- --------------------------------------------------------
-- Drop existing tables to allow clean reruns
-- (Child tables must be dropped before Parent tables)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `Account`;
DROP TABLE IF EXISTS `Product`;

-- --------------------------------------------------------
-- Create Tables
-- --------------------------------------------------------

-- Table: Account
CREATE TABLE `Account` (
    `AccountID` CHAR(8) NOT NULL,
    `username` VARCHAR(20) NOT NULL,
    `password` NVARCHAR(20) NOT NULL,
    PRIMARY KEY (`AccountID`)
);

-- Table: Product
CREATE TABLE `Product` (
    `ProductID` CHAR(8) NOT NULL,
    `name` VARCHAR(30) NOT NULL,
    `type` VARCHAR(30) NOT NULL,
    `brand` VARCHAR(30) NOT NULL,
    `price` DECIMAL(15,2) NOT NULL,
    `description` NVARCHAR(150) NULL,
    `image_url` VARCHAR(500) NULL,
    `status` TINYINT(1) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (`ProductID`)
);


-- --------------------------------------------------------
-- Insert Data
-- --------------------------------------------------------

-- 1. Insert Data into Account Table
INSERT INTO `Account` (`AccountID`, `username`, `password`) VALUES
('ACC00001', 'admin', '1234');
