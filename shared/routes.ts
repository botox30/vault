import { z } from 'zod';
import { insertUserSchema } from './schema';

const userResponseSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  email: z.string().nullable(),
});

const registerInputSchema = insertUserSchema
  .pick({ email: true, username: true, password: true })
  .extend({
    email: z.string().email(),
  });

const authResponseSchema = z.object({
  token: z.string(),
  user: userResponseSchema,
});

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  conflict: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/register',
      input: registerInputSchema,
      responses: {
        201: authResponseSchema,
        400: errorSchemas.validation,
        409: errorSchemas.conflict,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: authResponseSchema,
        401: z.object({ message: z.string() }),
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: userResponseSchema,
        401: z.void(),
      },
    },
    search: {
      method: 'GET' as const,
      path: '/api/users/search',
      responses: {
        200: z.object({
          id: z.string().uuid(),
          username: z.string(),
        }),
        404: errorSchemas.notFound,
      },
    },
  },
  friends: {
    request: {
      method: 'POST' as const,
      path: '/api/friends/request',
      input: z.object({ username: z.string() }),
      responses: {
        201: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
        409: errorSchemas.conflict,
      },
    },
    accept: {
      method: 'POST' as const,
      path: '/api/friends/:id/accept', // :id is requestId
      responses: {
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
    reject: {
      method: 'POST' as const,
      path: '/api/friends/:id/reject', // :id is requestId
      responses: {
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/friends',
      responses: {
        200: z.array(z.object({
          id: z.number(),
          friend: z.object({ id: z.string().uuid(), username: z.string() })
        })),
      },
    },
    requests: {
      method: 'GET' as const,
      path: '/api/friends/requests',
      responses: {
        200: z.array(z.object({
          id: z.number(),
          fromUser: z.object({ id: z.string().uuid(), username: z.string() }),
          createdAt: z.string().or(z.date()).nullable()
        })),
      },
    },
  },
  messages: {
    history: {
      method: "GET" as const,
      path: "/api/messages/:friendId",
      responses: {
        200: z.array(
          z.object({
            id: z.number(),
            fromUserId: z.string().uuid(),
            toUserId: z.string().uuid(),
            content: z.string(),
            createdAt: z.string().or(z.date()).nullable(),
          })
        ),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
