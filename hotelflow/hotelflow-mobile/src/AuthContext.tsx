import React, { createContext, useContext, useEffect, useState } from "react";
import { saveCreds, loadCreds, clearCreds, Credentials } from "./api";

type AuthCtx = { creds: Credentials | null; signIn: (c: Credentials)=>Promise<void>; signOut: ()=>Promise<void>; ready: boolean; };
const Ctx = createContext<AuthCtx>({} as any);
export const useAuth = () => useContext(Ctx);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [creds, setCreds] = useState<Credentials | null>(null);
    const [ready, setReady] = useState(false);
    useEffect(() => { (async () => { setCreds(await loadCreds()); setReady(true); })(); }, []);
    const signIn = async (c: Credentials) => { await saveCreds(c); setCreds(c); };
    const signOut = async () => { await clearCreds(); setCreds(null); };
    return <Ctx.Provider value={{ creds, signIn, signOut, ready }}>{children}</Ctx.Provider>;
};