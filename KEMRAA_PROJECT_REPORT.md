# 🏛️ KEMRAA — تقرير المشروع الكامل (Full Project Report)

**الإصدار:** v1.0 | **التاريخ:** 2026 | **الحالة:** Production-Ready ✅

---

## 1️⃣ الملخص التنفيذي

KEMRAA منصة SaaS سياحية Multi-Tenant متكاملة بتربط:
- **الشركاء** (فنادق، مطاعم، نقل، تأجير سيارات، أنشطة، جولات، تأمين، eSIM)
- **وكالات السفر** (مع Attribution tracking)
- **العملاء/المسافرين** (Travelers)
- **السائقين** (Drivers)
- **الإدارة المركزية** (KEMRAA Admin = مصدر الحقيقة)

في الجلسة دي اتبنى **Partner Dashboard كامل** (Backend + Frontend) مطابق للوثيقة التنفيذية (28 قسم).

---

## 2️⃣ المعمارية العامة


**قواعد معمارية (§2, §27, §28):**
- Multi-Tenant: كل شركة ليها Organization + Partner مستقل.
- الـ Dashboards واجهات تشغيل فقط — ممنوع الوصول المباشر لقاعدة البيانات.
- KEMRAA Admin تفضل طبقة التحكم المركزية.
- قبل أي Feature: تحديد مالك البيانات، الصلاحيات، الأثر المالي، Audit، Notification، Events، التصدير، اللغات.

---

## 3️⃣ التطبيقات (6 Apps)

| التطبيق | التقنية | Port | المستخدمون |
|---------|---------|------|-----------|
| Admin Web | Next.js 14 | 3000 | موظفي KEMRAA |
| Customer Web | Next.js 14 | 3001 | المسافرين |
| Partner Web | Next.js 14 + Tailwind + React Query | 3002 | الشركات الشريكة |
| Agency Web | Next.js 14 | 3003 | وكالات السفر |
| Driver Web | Next.js 14 | 3004 | السائقين |
| API | NestJS + Prisma | 4000 | كل التطبيقات |

---

## 4️⃣ الحزم المشتركة (12 Packages)

adapters, api-client, auth, config, domain, events, localization, money, types, ui, validation + (Prisma schema مركزي)

---

## 5️⃣ الأنظمة الفرعية (22 نظام)

1. **Multi-Tenant Organizations** — Organization / OrganizationMember / Partner / Agency / KYB
2. **Auth & Security** — JWT (7d access + 30d refresh)، MFA (TOTP pure crypto)، Trusted Devices، Forgot/Reset Password، Rate Limiting، Access Codes للموظفين
3. **Services & Catalog** — CRUD + تفعيل/إيقاف + Availability + سعات + صور + 8 أنواع خدمات
4. **Bookings State Machine** — DRAFT → PENDING_APPROVAL → CONFIRMING → CONFIRMED → IN_PROGRESS → COMPLETED (+ REJECTED/CANCELLED/FAILED) + Idempotency Keys + BookingStateHistory
5. **Financial Ledger** — CommissionRules / CommissionEntries / Settlements (Open→Closed→Approved→Paid) / Gross-Commission-Net / LedgerEntries (double-entry)
6. **Payments** — Stripe + Webhook verification + Refunds (جزئي/كلي) + PromoCodes + Adapter pattern لبوابات محلية (Accept/Paymob/Fawry)
7. **Transport** — Drivers (Online/Offline/Busy/Suspended + تحقق)، Vehicles (سعة/حالة/ربط سائق)، Rides (8 حالات) + RideEvents + RideIncidents
8. **Trips & Itineraries** — PLANNING → READY → BOOKED → COMPLETED + نسخ Itinerary + بنود يومية + تقدير تكلفة
9. **Documents & Contracts** — PartnerDocuments (رفع/حالة/ملاحظات) + SigningRequests (DRAFT→SENT→VIEWED→SIGNED→COMPLETED) + PDF
10. **Thoth AI Assistant** — ThothTools (مستويات خطورة) + Policy Engine + Tool Executor + Context Loader + سجل ThothActions
11. **Search (TypeSense)** — فهارس Services + Trips + مزامنة تلقائية + Faceted search
12. **Localization** — عربي/إنجليزي + RTL/LTR + عملات + تواريخ
13. **Analytics & Reports** — KPIs + فلاتر (يوم/أسبوع/شهر/مخصص) + تصدير CSV
14. **Notifications** — In-App + قنوات (حجز/دفع/دعم/نظام) + readAt
15. **Support** — تذاكر (Category/Priority/Status) + Replies مربوطة بالمرسل
16. **Reviews** — تقييم + تعليق + متوسط + توزيع (قراءة فقط للشريك)
17. **Referrals & Promos** — ReferralLinks + Events (clicks/conversions) + Attribution
18. **Feature Flags** — تشغيل/إيقاف ميزات بدون Deploy
19. **Content Management** — ContentItems متعددة اللغات + Publish/Draft
20. **Incidents & Safety** — OPEN→IN_PROGRESS→RESOLVED→CLOSED + خطورة + ربط بالرحلات
21. **Locations** — UserLocation + تجهيز Geocoding
22. **Settings** — AppSettings + إعدادات لكل منظمة

---

## 6️⃣ قاعدة البيانات (~50 Models)

**Core:** User, Organization, OrganizationMember, Partner, Agency, KYB
**Services/Bookings:** Service, ServiceAvailability, Booking, BookingItem, BookingStateHistory
**Finance:** CommissionRule, CommissionEntry, Settlement, LedgerEntry, Payment, PaymentStateHistory, Refund, PromoCode
**Transport:** Driver, Vehicle, Ride, RideEvent, RideIncident, UserLocation
**Trips:** Trip, Itinerary, ItineraryItem
**Docs/Contracts:** PartnerDocument, SigningRequest
**Support/Reviews:** SupportTicket, SupportReply, Review
**Notif/Content:** Notification, ContentItem, FeatureFlag, AppSettings
**AI:** ThothTool, ThothAction, ThothChatMessage
**Referrals:** ReferralLink, ReferralEvent, Attribution
**System:** AuditLog, TrustedDevice, UserMfa, PasswordResetToken, WebhookEvent, Incident

---

## 7️⃣ الـ API (~150 Endpoint) — وحدات رئيسية

Auth/Staff/Customer/Driver/Partner/Partners(Admin)/Organizations/Users/Services/Bookings/BookingsState/Drivers/Vehicles/Rides/Documents/Contracts/Signing/Finance/Settlements/FinanceAdmin/Commissions/Payments/PaymentsState/Refunds/Promos/Reports/Analytics/Search/Trips/Thoth/Ops/Notifications/Support/Reviews/Referrals/Locations/Incidents/Settings/FeatureFlags/AuditLogs/Health/Adapters-Webhooks

كل endpoint يطبق: Authentication + Authorization + Tenant Isolation + Validation + Audit عند الحاجة (§17).