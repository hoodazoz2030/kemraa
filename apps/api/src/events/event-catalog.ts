/**
 * §22 — Event Catalog
 * All events in the system
 */
export const EVENT_TYPES = {
  // Trip events
  TRIP_CREATED: "TRIP_CREATED",
  ITINERARY_APPROVED: "ITINERARY_APPROVED",
  TRIP_COMPLETED: "TRIP_COMPLETED",
  
  // Booking events
  BOOKING_CREATED: "BOOKING_CREATED",
  BOOKING_CONFIRMED: "BOOKING_CONFIRMED",
  BOOKING_CANCELLED: "BOOKING_CANCELLED",
  
  // Payment events
  PAYMENT_AUTHORIZED: "PAYMENT_AUTHORIZED",
  PAYMENT_CAPTURED: "PAYMENT_CAPTURED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  PAYMENT_REFUNDED: "PAYMENT_REFUNDED",
  
  // Ride events
  RIDE_ACCEPTED: "RIDE_ACCEPTED",
  RIDE_STARTED: "RIDE_STARTED",
  RIDE_COMPLETED: "RIDE_COMPLETED",
  DRIVER_ASSIGNED: "DRIVER_ASSIGNED",
  DRIVER_ARRIVED: "DRIVER_ARRIVED",
  
  // Flight events
  FLIGHT_DEPARTED: "FLIGHT_DEPARTED",
  FLIGHT_DELAYED: "FLIGHT_DELAYED",
  FLIGHT_ARRIVED: "FLIGHT_ARRIVED",
  AIRPORT_PICKUP_READY: "AIRPORT_PICKUP_READY",
  
  // Experience events
  HOTEL_CHECKIN: "HOTEL_CHECKIN",
  EXPERIENCE_REMINDER: "EXPERIENCE_REMINDER",
  
  // System events
  REFUND_ISSUED: "REFUND_ISSUED",
  TRAVELER_EXITED_EGYPT: "TRAVELER_EXITED_EGYPT",
  
  // Emergency
  EMERGENCY: "EMERGENCY",
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

export interface DomainEvent<T = any> {
  eventId: string;
  type: EventType;
  version: string;
  timestamp: Date;
  source: string;
  actor?: string;
  correlationId?: string;
  payload: T;
}

/**
 * Default notification channels per event type (all event types covered)
 */
export const EVENT_NOTIFICATION_DEFAULTS: Record<EventType, string[]> = {
  // Bookings
  [EVENT_TYPES.BOOKING_CONFIRMED]: ["push", "email"],
  [EVENT_TYPES.BOOKING_CREATED]: [],
  [EVENT_TYPES.BOOKING_CANCELLED]: ["push", "email"],
  
  // Payments
  [EVENT_TYPES.PAYMENT_AUTHORIZED]: ["push", "email"],
  [EVENT_TYPES.PAYMENT_CAPTURED]: ["push", "email"],
  [EVENT_TYPES.PAYMENT_FAILED]: ["push"],
  [EVENT_TYPES.PAYMENT_REFUNDED]: ["push", "email"],
  [EVENT_TYPES.REFUND_ISSUED]: ["push", "email"],
  
  // Rides
  [EVENT_TYPES.RIDE_ACCEPTED]: ["push"],
  [EVENT_TYPES.RIDE_STARTED]: ["push"],
  [EVENT_TYPES.RIDE_COMPLETED]: ["push"],
  [EVENT_TYPES.DRIVER_ASSIGNED]: ["push"],
  [EVENT_TYPES.DRIVER_ARRIVED]: ["push"],
  
  // Flights
  [EVENT_TYPES.FLIGHT_DEPARTED]: ["push"],
  [EVENT_TYPES.FLIGHT_DELAYED]: ["push", "email"],
  [EVENT_TYPES.FLIGHT_ARRIVED]: ["push"],
  [EVENT_TYPES.AIRPORT_PICKUP_READY]: ["push"],
  
  // Experiences
  [EVENT_TYPES.HOTEL_CHECKIN]: ["push"],
  [EVENT_TYPES.EXPERIENCE_REMINDER]: ["push"],
  
  // Trips
  [EVENT_TYPES.TRIP_CREATED]: [],
  [EVENT_TYPES.ITINERARY_APPROVED]: ["push"],
  [EVENT_TYPES.TRIP_COMPLETED]: ["push", "email"],
  
  // System
  [EVENT_TYPES.TRAVELER_EXITED_EGYPT]: [],
  
  // Emergency
  [EVENT_TYPES.EMERGENCY]: ["push", "email", "sms"],
};
