import { z } from "zod";

export const Role = z.enum(["USER", "INSTRUCTOR", "ADMIN"]);
export type Role = z.infer<typeof Role>;

export const SessionStatus = z.enum(["SCHEDULED", "CANCELLED", "COMPLETED"]);
export type SessionStatus = z.infer<typeof SessionStatus>;

export const BookingStatus = z.enum([
  "CONFIRMED",
  "WAITLIST",
  "CANCELLED",
  "ATTENDED",
  "NO_SHOW",
]);
export type BookingStatus = z.infer<typeof BookingStatus>;

export const PlanType = z.enum(["CREDIT_PACK", "SUBSCRIPTION"]);
export type PlanType = z.infer<typeof PlanType>;

export const SubscriptionStatus = z.enum([
  "ACTIVE",
  "CANCELLED",
  "EXPIRED",
  "FROZEN",
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatus>;

export const TransactionType = z.enum([
  "PURCHASE_PACK",
  "PURCHASE_SUBSCRIPTION",
  "CREDIT_USE",
  "CREDIT_REFUND",
  "ADMIN_ADJUST",
  "LATE_CANCEL_FEE",
  "NO_SHOW_FEE",
  "PROMO",
]);
export type TransactionType = z.infer<typeof TransactionType>;

export const PaymentStatus = z.enum([
  "PENDING",
  "PAID",
  "REFUNDED",
  "FAILED",
  "FREE",
]);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

export const PromoDiscountType = z.enum(["PERCENT", "FIXED_CENTS", "FREE_CREDITS"]);
export type PromoDiscountType = z.infer<typeof PromoDiscountType>;

export const CheckInSource = z.enum(["QR", "MANUAL", "SELF"]);
export type CheckInSource = z.infer<typeof CheckInSource>;
