/* Response shapes returned by the API. The web app consumes exactly these. */
import type { CampaignKind, Condition, DeliveryMethod, Gender, ListingStatus, Mode, OrderStatus, Origin, ReportReason, ReportStatus, Role, SellerType, StorePlan, VerificationStatus } from "./constants.js";

export interface ApiError {
  error: { code: string; message: string; fields?: Record<string, string> };
}

export interface SellerSummary {
  id: string;
  type: SellerType;
  plan: StorePlan;
  displayName: string;
  handle: string | null;
  city: string;
  area: string | null;
  verified: boolean;
  ratingAvg: number;
  ratingCount: number;
  logoUrl: string | null;
}

export interface SellerPublic extends SellerSummary {
  bio: string | null;
  bannerUrl: string | null;
  phone: string | null;
  joinedAt: string;
  soldCount: number;
  activeListings: number;
  followers: number;
  isFollowing?: boolean;
  /** Business stores: how they sell. Null for everyone else, or when nothing is filled in. */
  business: BusinessDetails | null;
}

export interface BusinessDetails {
  shopAddress: string | null;
  openingHours: string | null;
  deliveryAreas: string | null;
  storePolicy: string | null;
}

export interface Me {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  phone: string | null;
  city: string | null;
  location: { lat: number; lng: number } | null;
  activeMode: Mode;
  role: Role;
  seller: MySeller | null;
  createdAt: string;
}

/** The owner's view of their own seller profile */
export interface MySeller extends SellerPublic {
  boostCredits: number;
  /** Billing date, and when monthly boost credits are topped up */
  planRenewsAt: string | null;
  verificationStatus: VerificationStatus;
  verificationReply: string | null;
  /** Saved business details (always returned to the owner, even before they're shown publicly) */
  details: BusinessDetails;
}

export interface AuthResponse {
  accessToken: string;
  /** Seconds until the access token expires */
  expiresIn: number;
  user: Me;
}

export interface ListingPhoto {
  url: string;
  label: string | null;
}

export interface ListingCard {
  id: string;
  title: string;
  price: number;
  department: string;
  category: string;
  condition: Condition;
  size: string | null;
  brand: string | null;
  extra: boolean;
  city: string;
  area: string | null;
  photo: string | null;
  status: ListingStatus;
  createdAt: string;
  boosted: boolean;
  /** Metres from the searcher, when a location was given */
  distanceM: number | null;
  seller: Pick<SellerSummary, "id" | "displayName" | "handle" | "verified" | "type">;
  saved?: boolean;
}

export interface ListingDetail extends Omit<ListingCard, "photo" | "seller"> {
  description: string;
  color: string | null;
  gender: Gender | null;
  origin: Origin | null;
  tested: boolean;
  flaws: string[];
  specs: [string, string][];
  photos: ListingPhoto[];
  openToOffers: boolean;
  canDeliver: boolean;
  allowPickup: boolean;
  views: number;
  savesCount: number;
  location: { lat: number; lng: number } | null;
  seller: SellerPublic;
}

export interface Facet {
  value: string;
  count: number;
}

export interface SearchResponse {
  items: ListingCard[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    department: Facet[];
    category: Facet[];
    condition: Facet[];
    city: Facet[];
  };
}

export interface MessageDTO {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  clientId: string | null;
}

export interface ConversationDTO {
  id: string;
  listing: { id: string; title: string; price: number; photo: string | null; status: ListingStatus } | null;
  /** The other person in the chat */
  counterpart: { userId: string; name: string; sellerHandle: string | null; /** Set when the other person is the seller (so the buyer can rate them) */ sellerId: string | null };
  role: "BUYER" | "SELLER";
  lastMessage: Pick<MessageDTO, "body" | "createdAt" | "senderId"> | null;
  unread: number;
  updatedAt: string;
}

export interface Paged<T> {
  items: T[];
  nextCursor: string | null;
}

export interface OrderItemDTO {
  listingId: string | null;
  title: string;
  price: number;
  photo: string | null;
  condition: Condition | null;
}

export interface OrderDTO {
  id: string;
  /** Short reference people can read out on the phone, e.g. DRB-7K3F2Q */
  code: string;
  status: OrderStatus;
  /** The viewer's side of this order */
  role: "BUYER" | "SELLER";
  deliveryMethod: DeliveryMethod;
  contact: { name: string; phone: string; address: string | null; city: string; note: string | null };
  items: OrderItemDTO[];
  total: number;
  seller: { id: string; displayName: string; handle: string | null; verified: boolean; plan: StorePlan };
  buyer: { id: string; name: string };
  conversationId: string | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  deliveredAt: string | null;
  /** Buyer has already rated this seller */
  rated?: boolean;
}

export interface BagItemDTO {
  id: string;
  title: string;
  price: number;
  photo: string | null;
  condition: Condition;
  city: string;
  seller: { id: string; displayName: string; verified: boolean };
}

export interface CampaignDTO {
  id: string;
  kind: CampaignKind;
  label: string;
  listingCount: number;
  days: number;
  endsAt: string;
  createdAt: string;
  active: boolean;
}

export interface AnalyticsPoint {
  /** YYYY-MM-DD, Lagos time */
  day: string;
  views: number;
  saves: number;
  chats: number;
  requests: number;
}

export interface AnalyticsTotals {
  views: number;
  saves: number;
  chats: number;
  requests: number;
  sold: number;
}

export interface AnalyticsListingRow {
  id: string;
  title: string;
  photo: string | null;
  price: number;
  status: ListingStatus;
  views: number;
  saves: number;
  chats: number;
  requests: number;
}

export interface AnalyticsDTO {
  days: number;
  /** Longest range the seller's plan allows */
  maxDays: number;
  series: AnalyticsPoint[];
  totals: AnalyticsTotals;
  /** The same numbers for the period before, for "vs last 30 days" */
  previous: AnalyticsTotals;
  listings: AnalyticsListingRow[];
  /** Business stores only */
  advanced: {
    categories: { category: string; listings: number; views: number; saves: number; requests: number; sold: number }[];
    buyerCities: { city: string; requests: number }[];
    funnel: { views: number; chats: number; requests: number; delivered: number };
    weekdays: { weekday: number; views: number }[];
  } | null;
}

/* Admin */
export interface AdminSummary {
  users: number;
  newUsersWeek: number;
  sellers: number;
  stores: number;
  activeListings: number;
  ordersWeek: number;
  openReports: number;
  pendingVerifications: number;
  suspended: number;
  recent: AdminActionDTO[];
}

export interface AdminActionDTO {
  id: string;
  admin: string;
  action: string;
  targetType: string;
  targetId: string;
  note: string | null;
  createdAt: string;
}

export interface AdminReportDTO {
  id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
  reporter: { id: string; name: string; email: string };
  listing: { id: string; title: string; photo: string | null; price: number; status: ListingStatus } | null;
  seller: { id: string; displayName: string; handle: string | null; plan: StorePlan; suspended: boolean; userId: string };
  /** Other open reports about the same listing (or seller, for seller reports) */
  sameTarget: number;
}

export interface AdminVerificationDTO {
  sellerId: string;
  displayName: string;
  handle: string | null;
  plan: StorePlan;
  city: string;
  status: VerificationStatus;
  note: string | null;
  requestedAt: string | null;
  joinedAt: string;
  owner: { name: string; email: string; phone: string | null; emailVerified: boolean };
  activeListings: number;
  soldCount: number;
  delivered: number;
  ratingAvg: number;
  ratingCount: number;
  openReports: number;
}

export interface AdminUserDTO {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  createdAt: string;
  suspendedAt: string | null;
  suspendedReason: string | null;
  seller: { id: string; displayName: string; handle: string | null; plan: StorePlan; verified: boolean; activeListings: number } | null;
  reports: number;
}

export interface AdminListingDTO {
  id: string;
  title: string;
  price: number;
  photo: string | null;
  status: ListingStatus;
  removedReason: string | null;
  createdAt: string;
  seller: { id: string; displayName: string; handle: string | null; suspended: boolean };
  reports: number;
}
