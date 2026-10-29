# Original User Request

## Initial Request — 2026-10-28T17:45:14Z

# Teamwork Project Prompt — Roby Store (Next.js E-Commerce Catalog & Social Ordering Website)

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Full multi-agent team (Frontend Developers, Designers, QA & Adversarial Reviewers)

Roby Store is a responsive Next.js (TypeScript & Tailwind CSS) web application for a women's fashion and home-textile e-commerce catalog featuring dynamic categories, multi-variant products, shopping cart, and a social commerce ordering workflow (WhatsApp click-to-chat and direct messaging handoff) with a decoupled REST API service layer.

Working directory: E:\learning\eraa soft\flutter\roby_store
Integrity mode: development

## Requirements

### R1. Dynamic Product Catalog & Category Navigation
A modern, responsive e-commerce web interface built with Next.js, TypeScript, and Tailwind CSS. The catalog must dynamically load categories, subcategories (multi-level hierarchy), promotional banners, and product listings from a dedicated API service layer (with offline/mock JSON fallback data matching the backend schema). Supports keyword search, pagination, and multi-facet filtering (category, size, color, price range, stock availability).

### R2. Product Details & Interactive Variant Selection
Product pages displaying an image carousel/gallery, descriptions, original and discounted prices, and variant selectors (color, size, quantity). The UI must dynamically update price, SKU, and stock availability based on active variant selections and prevent adding out-of-stock items.

### R3. Shopping Cart & Form Validation
A reactive shopping cart allowing users to modify quantities, inspect/change variants, remove items, and calculate mathematical totals (subtotal, discounts). A customer checkout form capturing customer name, phone number, governorate/city, delivery address, and notes with strict client-side validation.

### R4. Social Commerce Checkout & WhatsApp Link Dispatch
When an order is submitted:
1. Validates order payload and customer details.
2. Formats a structured, itemized order receipt string (order reference, items, chosen variants, pricing, customer details).
3. Dispatches via WhatsApp Click-to-Chat (`https://wa.me/` protocol) with pre-filled URI-encoded message.
4. Provides quick-copy summary options for Instagram Direct and Facebook Messenger.

### R5. Decoupled Architecture & Resilient UI States
Strict separation between UI components, state management (e.g. Zustand or React Context), and data access. The API base URL must be configurable via environment variables (`NEXT_PUBLIC_API_BASE_URL`), with a swappable mock service layer. Every data-driven page and component must handle all 4 core UI states: Loading (skeleton loaders), Success, Empty (e.g. no products found), and Error (with user-friendly retry mechanism).

### R6. Comprehensive Multi-Layer Test Strategy
Automated testing suite covering the entire web application:
- Unit & Service Tests (data models, API client, mock layer, cart calculations, WhatsApp URL encoding).
- Component & Widget Tests (category navigation, variant picker, form validation triggers, UI states).
- End-to-End / Flow Tests (full user flow from browsing catalog to order message dispatch).

## Acceptance Criteria

### 1. Data & Mock Service Layer Tests
- [ ] TypeScript interfaces and API adapters accurately parse category, product, variant, and order payloads.
- [ ] Mock API layer reliably serves sample data and gracefully handles simulated network errors, empty results, and 500 status codes.

### 2. State & Cart Logic Tests
- [ ] Cart calculations (unit prices, quantities, variant pricing, subtotal) are mathematically exact.
- [ ] Cart state correctly handles adding existing products, updating quantities, deleting items, and enforcing stock limits.
- [ ] Order generation formats an accurate, human-readable itemized summary and produces a valid URI-encoded `wa.me` URL.

### 3. Component & UI Interaction Tests
- [ ] Dynamic category tree renders parent and nested subcategories properly.
- [ ] Variant selector switches active states and disables out-of-stock options.
- [ ] Checkout form validates required fields and displays validation error text on empty or invalid inputs.
- [ ] Skeleton loaders display during data fetch, error widgets appear on failure with a functional retry button, and empty state renders when queries yield no items.

### 4. End-to-End Flow Verification
- [ ] End-to-end integration test verifies the entire journey: Home -> Category Navigation -> Search & Filter -> Product Details -> Variant Selection -> Add to Cart -> Checkout Form -> WhatsApp Link Dispatch.
- [ ] Automated test suite (`npm test` / `pnpm test`) runs to completion with 0 errors and 0 failures.


## Follow-up — 2026-10-29T08:33:52Z

Resume work on Roby Store. The scaffolding and models have been initialized. Please continue with the milestones and include the dynamic Store Settings (configurable WhatsApp number and social channels from the Admin Dashboard) as requested by the user.
