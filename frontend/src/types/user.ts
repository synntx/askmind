export interface User {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  space_limit: number;
  created_at: string;
  updated_at: string;
}

export type GetUser = {
  data: User;
};
