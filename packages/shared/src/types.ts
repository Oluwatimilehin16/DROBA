/* Response shapes returned by the API. The web app consumes exactly these. */
import type { Condition, Gender, ListingStatus, Mode, Origin, SellerType, StorePlan } from "./constants.js";

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
  seller: (SellerPublic & { boostCredits: number }) | null;
  createdAt: string;
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
