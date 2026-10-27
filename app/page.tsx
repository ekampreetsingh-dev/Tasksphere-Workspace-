import { StoreProvider } from "@/lib/store";
import { ToastProvider } from "@/lib/toast";
import Workspace from "@/components/Workspace";
import ServiceWorker from "@/components/ServiceWorker";

export default function Page() {
  return (
    <StoreProvider>
      <ToastProvider>
        <Workspace />
        <ServiceWorker />
      </ToastProvider>
    </StoreProvider>
  );
}
