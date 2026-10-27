import type { Metadata } from "next";
import { StoreProvider } from "@/lib/store";
import { ToastProvider } from "@/lib/toast";
import PopupApp from "@/components/PopupApp";

export const metadata: Metadata = {
  title: "TaskSphere · Quick capture",
  robots: { index: false },
};

export default function PopupPage() {
  return (
    <StoreProvider>
      <ToastProvider>
        <PopupApp />
      </ToastProvider>
    </StoreProvider>
  );
}
