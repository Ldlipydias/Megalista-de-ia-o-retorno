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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setError(null);
      
      if (firebaseUser) {
        try {
          const primaryAdmin = "kakaxe188@gmail.com";
          const userEmail = firebaseUser.email?.toLowerCase() || "";
          console.log("Tentativa de login com:", userEmail);
          const isPrimaryAdmin = userEmail === primaryAdmin.toLowerCase();
          
          if (!isPrimaryAdmin) {
            const whitelistRef = collection(db, 'whitelist');
            const q = query(whitelistRef, where('email', '==', firebaseUser.email));
            try {
              const querySnapshot = await getDocs(q);
              if (querySnapshot.empty) {
                await logout();
                setError("Seu e-mail não está na lista de permissões.");
                setUser(null);
                setLoading(false);
                return;
              }
            } catch (e) {
              const msg = handleFirestoreError(e, OperationType.LIST, 'whitelist');
              setError("Erro ao verificar permissão: " + msg);
              await logout();
              setLoading(false);
              return;
            }
          }

          const userDocRef = doc(db, 'users', firebaseUser.uid);
          let userDoc;
          try {
            userDoc = await getDoc(userDocRef);
          } catch (e) {
            handleFirestoreError(e, OperationType.GET, `users/${firebaseUser.uid}`);
            // If we can't read the user doc, we might be a new admin
            userDoc = { exists: () => false };
          }

          if (userDoc.exists()) {
            setUser(userDoc.data() as UserProfile);
          } else {
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: isPrimaryAdmin ? 'admin' : 'user',
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
            };
            try {
              await setDoc(userDocRef, newUser);
              setUser(newUser);
            } catch (e) {
              const msg = handleFirestoreError(e, OperationType.CREATE, `users/${firebaseUser.uid}`);
              setError("Erro ao criar perfil: " + msg);
              setUser(null);
            }
          }
        } catch (err) {
          console.error("Auth process error:", err);
          setError("Erro ao processar login.");
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      return true;
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-email') {
        setError("E-mail ou senha incorretos. Se você esqueceu sua senha, use o link 'Esqueci a senha' abaixo.");
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("O login por e-mail não está ativado. O administrador precisa ativar 'Email/Password' no Console do Firebase (Authentication > Sign-in method).");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Muitas tentativas malsucedidas. Tente novamente mais tarde ou redefina sua senha.");
      } else {
        setError("Erro ao entrar: " + (err.message || "Verifique seus dados."));
      }
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
      const primaryAdmin = "kakaxe188@gmail.com";
      const isPrimaryAdmin = email.toLowerCase() === primaryAdmin.toLowerCase();

      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const firebaseUser = userCredential.user;

      // If not admin, check whitelist
      if (!isPrimaryAdmin) {
        try {
          const whitelistRef = collection(db, 'whitelist');
          const q = query(whitelistRef, where('email', '==', email));
          const querySnapshot = await getDocs(q);
          if (querySnapshot.empty) {
            // Not authorized, sign out and delete the account
            await firebaseUser.delete();
            setError("Seu e-mail não está autorizado pelo administrador.");
            setLoading(false);
            return false;
          }
        } catch (whitelistErr) {
          console.error("Whitelist check error during register:", whitelistErr);
          // If whitelist check fails, we should probably not allow registration
          await firebaseUser.delete();
          setError("Erro ao verificar autorização. Tente novamente.");
          setLoading(false);
          return false;
        }
      }

      const newUser: UserProfile = {
        uid: firebaseUser.uid,
        email: email,
        role: isPrimaryAdmin ? 'admin' : 'user',
        displayName: name,
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8B5CF6&color=fff`,
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
      setUser(newUser);
      return true;
    } catch (err: any) {
      console.error("Register error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError("Este e-mail já está cadastrado. Por favor, tente fazer login em vez de criar uma nova conta.");
      } else if (err.code === 'auth/weak-password') {
        setError("A senha é muito fraca. Use pelo menos 6 caracteres.");
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("O cadastro por e-mail não está ativado. O administrador precisa ativar 'Email/Password' no Console do Firebase (Authentication > Sign-in method).");
      } else if (err.code === 'auth/invalid-email') {
        setError("O formato do e-mail é inválido.");
      } else {
        setError("Erro ao criar conta: " + (err.message || "Verifique se o e-mail está correto."));
      }
      return false;
    } finally {
      setLoading(false);
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

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, resetPassword, signout }}>
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
