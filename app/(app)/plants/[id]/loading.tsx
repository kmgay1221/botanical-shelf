import { Spinner } from "@/components/Spinner";

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-full">
      <Spinner size={22} color="var(--glaucous)" />
    </div>
  );
}
