import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      roles?: string[];
      memberId?: number | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    roles?: string[];
    memberId?: number | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    roles?: string[];
    memberId?: number | null;
  }
}
