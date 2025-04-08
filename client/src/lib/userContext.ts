// This is a compatibility layer to avoid breaking the dashboard
// It re-exports AuthContext for components that expect UserContext

import { AuthContext } from '../hooks/use-auth';

export default AuthContext;