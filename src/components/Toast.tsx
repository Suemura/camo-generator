import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./Toast.module.scss";

type Kind = "info" | "success" | "error";
interface Msg {
  id: number;
  kind: Kind;
  text: string;
}
const Ctx = createContext<(text: string, kind?: Kind) => void>(() => {});

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const seq = useRef(0);
  const push = useCallback((text: string, kind: Kind = "info") => {
    const id = ++seq.current;
    setMsgs((m) => [...m, { id, kind, text }]);
    setTimeout(() => setMsgs((m) => m.filter((x) => x.id !== id)), 3200);
  }, []);
  const value = useMemo(() => push, [push]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className={styles.stack} role="status" aria-live="polite">
        {msgs.map((m) => (
          <div key={m.id} className={`${styles.toast} ${styles[m.kind]}`}>
            {m.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
