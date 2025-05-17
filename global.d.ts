import 'express-session';
import { User } from './src/types';

declare module 'express-session' {
    interface SessionData {
        user?: {
            _id: User['_id'];
            token: string;
            lastAccess: Date,
            username: string
        } | null;
    }
}