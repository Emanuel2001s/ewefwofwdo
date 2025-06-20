import { notFound } from "next/navigation";
import { PlanForm } from "@/components/plan-form";
import { getPlano } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EditarPlanoPageProps {
  params: { id: string };
}

export default async function EditarPlanoPage({ params }: EditarPlanoPageProps) {
  const id = Number(params.id);

  if (isNaN(id)) {
    notFound();
  }

  const plan = await getPlano(id);

  if (!plan) {
    notFound();
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-10">
      <Card className="w-full max-w-2xl">
        <CardHeader className="bg-blue-600 text-white rounded-t-lg">
          <CardTitle>Editar Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <PlanForm plan={plan} />
        </CardContent>
      </Card>
    </div>
  );
} 