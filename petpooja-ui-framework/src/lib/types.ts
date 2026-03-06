// ─── SmartBite AI Type Definitions ─────────────────────────────────────────

export interface DashboardSummary {
  total_revenue_30d: number;
  total_margin_30d: number;
  margin_pct: number;
  aov_7d: number;
  total_orders_7d: number;
  voice_orders: number;
  stars: number;
  dogs: number;
  puzzles: number;
  plowhorses?: number;
  missed_calls: number;
  opportunity_score_total: number;
}

export interface MenuItem {
  id: number;
  name: string;
  category: string;
  selling_price: number;
  food_cost: number;
  contribution_margin: number;
  cm_percentage: number;
  units_sold: number;
  revenue: number;
  total_margin: number;
  quadrant: "Star" | "Plowhorse" | "Puzzle" | "Dog";
  quadrant_color: string;
  opportunity_score: number;
  price_action: string;
}

export interface MenuAnalyticsResponse {
  items: MenuItem[];
  median_units: number;
  median_cm: number;
}

export interface AIRecommendation {
  item_id: number;
  item_name: string;
  quadrant: string;
  current_price: number;
  suggested_price?: number;
  combo_price?: number;
  reasoning: string;
  projected_gain: number;
  confidence: "High" | "Medium" | "Low";
  action: "raise_price" | "create_combo" | "promote";
  combo_with?: string;
  status?: "pending" | "approved" | "rejected";
}

export interface AIRecommendationsResponse {
  recommendations: AIRecommendation[];
  total_projected_monthly_gain: number;
}

export interface MenuCombo {
  item_a: string;
  item_b: string;
  frequency: number;
  original_price: number;
  combo_price: number;
  saving: number;
}

export interface MenuCombosResponse {
  combos: MenuCombo[];
}

export interface HourlyData {
  hour: string;
  orders: number;
  avg_aov: number;
}

export interface DeadHoursResponse {
  hourly_data: HourlyData[];
}

export interface VoiceOrder {
  id: number;
  phone: string;
  transcript: string;
  structured_order: string; // JSON string
  created_at: string;
  status: "confirmed" | "pending" | "cancelled";
}

export interface VoiceOrdersResponse {
  orders: VoiceOrder[];
}

export interface VoiceOrderItem {
  name: string;
  qty: number;
  item?: string; // Alternative field name used in some responses
}

export interface VoiceDemoResponse {
  success: boolean;
  transcript: string;
  items: VoiceOrderItem[];
  total: number;
  error?: string;
}

export interface MissedCall {
  id: number;
  phone: string;
  timestamp: string;
  recovered: number; // 0 or 1
}

export interface MissedCallsResponse {
  missed_calls: MissedCall[];
}

export interface MenuActionRequest {
  type: "raise_price" | "archive";
  new_price?: number;
}

export interface AIDecisionRequest {
  action: "approve" | "reject";
  suggested_price?: number;
}

// Parsed voice order item for display
export interface ParsedOrderItem {
  name: string;
  qty: number;
}
