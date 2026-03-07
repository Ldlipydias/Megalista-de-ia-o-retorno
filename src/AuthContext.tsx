import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  onAuthStateChanged, 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  getDocFromServer
} from 'firebase/firestore';
import { auth, db, logout, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from './firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return JSON.stringify(errInfo);
}

interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'user';
  displayName: string;
  photoURL: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (email: string, pass: string, name: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
  signout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
          setError("Erro de conexão com o Firebase. Verifique a configuração.");
        }
      }
    };
    testConnection();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;
      
      setLoading(true);
      setError(null);
      
      if (firebaseUser) {
        try {
          const primaryAdmin = "kakaxe188@gmail.com";
          const userEmail = firebaseUser.email?.toLowerCase() || "";
          const isPrimaryAdmin = userEmail === primaryAdmin.toLowerCase();
          
          if (!isPrimaryAdmin) {
            const whitelistRef = collection(db, 'whitelist');
            const q = query(whitelistRef, where('email', '==', userEmail));
            
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
              await auth.signOut();
              if (isMounted) {
                setError("Seu e-mail não está na lista de permissões.");
                setUser(null);
                setLoading(false);
              }
              return;
            }
          }

          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (!isMounted) return;

          if (userDoc.exists()) {
            setUser(userDoc.data() as UserProfile);
          } else {
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: isPrimaryAdmin ? 'admin' : 'user',
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
              photoURL: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(firebaseUser.email || 'U')}&background=8B5CF6&color=fff`,
            };
            await setDoc(userDocRef, newUser);
            if (isMounted) setUser(newUser);
          }
        } catch (err: any) {
          console.error("Auth process error:", err);
          if (isMounted) {
            if (err.code === 'permission-denied') {
              // This might happen if the user was just deleted or rules are tight
              await auth.signOut();
              setError("Erro de permissão ao acessar seu perfil.");
            } else {
              setError("Erro ao processar login: " + (err.message || "Erro desconhecido"));
            }
            setUser(null);
          }
        }
      } else {
        if (isMounted) setUser(null);
      }
      
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    const emailLower = email.toLowerCase().trim();
    if (!emailLower || !pass) {
      setError("Por favor, preencha todos os campos.");
      return false;
    }

    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, emailLower, pass);
      // onAuthStateChanged will handle the rest
      return true;
    } catch (err: any) {
      console.error("Login error:", err);
      let msg = "Erro ao entrar. Verifique seus dados.";
      
      // auth/invalid-credential is the modern Firebase error for wrong email/password
      if (err.code === 'auth/user-not-found' || 
          err.code === 'auth/invalid-credential' || 
          err.code === 'auth/wrong-password' || 
          err.code === 'auth/invalid-email') {
        msg = "E-mail ou senha incorretos. Verifique se digitou corretamente ou se sua conta foi autorizada.";
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = "O login por e-mail não está ativado no Firebase.";
      } else if (err.code === 'auth/too-many-requests') {
        msg = "Muitas tentativas malsucedidas. Tente novamente em alguns minutos.";
      } else if (err.code === 'auth/network-request-failed') {
        msg = "Erro de rede. Verifique sua conexão com a internet.";
      } else if (err.code === 'auth/user-disabled') {
        msg = "Esta conta foi desativada pelo administrador.";
      }
      
      setError(msg);
      setLoading(false);
      return false;
    }
  };

  const register = async (email: string, pass: string, name: string): Promise<boolean> => {
    if (pass.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return false;
    }
    
    setLoading(true);
    setError(null);
    try {
      const emailLower = email.toLowerCase().trim();
      const primaryAdmin = "kakaxe188@gmail.com";
      const isPrimaryAdmin = emailLower === primaryAdmin.toLowerCase();

      // Check whitelist BEFORE creating account if possible
      // (But we need auth to read whitelist usually, so we create first then check)
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const firebaseUser = userCredential.user;

      if (!isPrimaryAdmin) {
        const whitelistRef = collection(db, 'whitelist');
        const q = query(whitelistRef, where('email', '==', emailLower));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          await firebaseUser.delete();
          setError("Seu e-mail não está autorizado pelo administrador.");
          setLoading(false);
          return false;
        }
      }

      const newUser: UserProfile = {
        uid: firebaseUser.uid,
        email: emailLower,
        role: isPrimaryAdmin ? 'admin' : 'user',
        displayName: name,
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8B5CF6&color=fff`,
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
      setUser(newUser);
      setLoading(false);
      return true;
    } catch (err: any) {
      console.error("Register error:", err);
      let msg = "Erro ao criar conta.";
      
      if (err.code === 'auth/email-already-in-use') {
        msg = "Este e-mail já está cadastrado.";
      } else if (err.code === 'auth/weak-password') {
        msg = "A senha é muito fraca.";
      } else if (err.code === 'auth/invalid-email') {
        msg = "E-mail inválido.";
      }
      
      setError(msg);
      setLoading(false);
      return false;
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      alert("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
    } catch (err: any) {
      console.error("Reset error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
        setError("E-mail não encontrado ou inválido.");
      } else {
        setError("Erro ao enviar e-mail de recuperação. Tente novamente mais tarde.");
      }
    } finally {
      setLoading(false);
    }
  };

  const signout = async () => {
    await logout();
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, resetPassword, signout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
