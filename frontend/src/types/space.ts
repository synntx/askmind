export type SpaceListResponse = {
  data: Space[];
};

export interface Space {
  space_id: string;
  user_id: string;
  title: string;
  description: string;
  source_limit: number;
  created_at: string;
  updated_at: string;
}
