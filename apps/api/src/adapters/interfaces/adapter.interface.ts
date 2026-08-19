/**
 * §24 — Standard adapter interfaces for service providers.
 * Each adapter implements these contracts regardless of the underlying API.
 */

export interface ProviderIdentity {
  id: string;           // Internal provider ID in our system
  name: string;         // Display name
  code: string;         // e.g., "MOCK_FLIGHT", "SABRE", "AMADEUS"
  serviceType: "FLIGHT" | "HOTEL" | "ACTIVITY" | "CAR" | "TRANSFER" | "CRUISE" | "TICKET" | "INSURANCE";
  enabled: boolean;
}

export interface SearchParams {
  query: any;
  currency?: string;
  locale?: string;
  limit?: number;
}

export interface SearchResult {
  providerId: string;
  externalId: string;
  title: string;
  description?: string;
  priceMinor: number;
  currency: string;
  availability: {
    seats?: number;
    rooms?: number;
    slots?: number;
  };
  details: any; // Provider-specific metadata
}

export interface BookParams {
  externalId: string;
  items: any[];
  travelerId: string;
  bookingId: string;
  totalMinor: number;
  currency: string;
  metadata?: any;
}

export interface BookResult {
  providerId: string;
  externalRef: string;      // Provider's confirmation code
  status: "CONFIRMED" | "PENDING" | "FAILED";
  details?: any;
}

export interface CancelParams {
  externalRef: string;
  reason?: string;
}

export interface CancelResult {
  success: boolean;
  refundEligible: boolean;
  details?: any;
}

export interface StatusResult {
  externalRef: string;
  status: "CONFIRMED" | "PENDING" | "CANCELLED" | "COMPLETED" | "FAILED";
  details?: any;
}

/**
 * Base interface — all adapters must implement these.
 */
export interface BaseAdapter {
  getIdentity(): ProviderIdentity;

  search(params: SearchParams): Promise<SearchResult[]>;
  book(params: BookParams): Promise<BookResult>;
  cancel(params: CancelParams): Promise<CancelResult>;
  checkStatus(externalRef: string): Promise<StatusResult>;
}

export interface FlightAdapter extends BaseAdapter {
  searchFlights(params: {
    origin: string;      // IATA code
    destination: string; // IATA code
    departureDate: string;
    returnDate?: string;
    passengers: number;
    cabin?: "ECONOMY" | "BUSINESS" | "FIRST";
  }): Promise<SearchResult[]>;
}

export interface HotelAdapter extends BaseAdapter {
  searchHotels(params: {
    city: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    rooms: number;
  }): Promise<SearchResult[]>;
}

export interface ActivityAdapter extends BaseAdapter {
  searchActivities(params: {
    location: string;
    date?: string;
    category?: string;
  }): Promise<SearchResult[]>;
}
