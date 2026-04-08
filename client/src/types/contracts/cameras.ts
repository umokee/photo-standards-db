export interface Camera {
  id: string;
  name: string;
  rtsp_url: string;
  resolution: string | null;
  location: string | null;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
}
