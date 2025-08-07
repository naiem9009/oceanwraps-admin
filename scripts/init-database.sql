-- Create database tables
-- This script will be automatically executed when you run the project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ADVANCE_PENDING', 'ADVANCE_PAID', 'FULLY_PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE "PaymentType" AS ENUM ('ADVANCE', 'REMAINING', 'FULL');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- The tables will be created automatically by Prisma migrations
-- Run: npx prisma migrate dev --name init
-- Run: npx prisma generate
