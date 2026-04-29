"use client";
import RoutineEditor from "@/components/RoutineEditor";
import { useParams } from "next/navigation";

export default function EditRoutinePage() {
  const params = useParams();
  const id = params.id as string;
  return <RoutineEditor routineId={id} />;
}
