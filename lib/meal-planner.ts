export type DietStyle = "onivora" | "vegetariana" | "vegana";
export type Avoid = "leite" | "ovos" | "peixe";
type Slot = "breakfast" | "lunch" | "snack" | "dinner" | "supper";
type Idea = { text: string; styles: DietStyle[]; contains?: Avoid[] };
const all: DietStyle[] = ["onivora", "vegetariana", "vegana"];
const animal: DietStyle[] = ["onivora", "vegetariana"];

const ideas: Record<Slot, Idea[]> = {
  breakfast: [
    { text: "Ovos, pão integral e fruta", styles: animal, contains: ["ovos"] },
    { text: "Iogurte natural, aveia e banana", styles: animal, contains: ["leite"] },
    { text: "Tapioca com banana e pasta de amendoim", styles: all },
    { text: "Pão integral com pasta de grão-de-bico e fruta", styles: all },
  ],
  lunch: [
    { text: "Arroz, feijão, frango grelhado e salada", styles: ["onivora"] },
    { text: "Arroz, feijão, tofu grelhado e salada", styles: all },
    { text: "Quinoa, lentilha, abóbora e folhas", styles: all },
    { text: "Peixe assado, batata e legumes", styles: ["onivora"], contains: ["peixe"] },
    { text: "Omelete com legumes, arroz e salada", styles: animal, contains: ["ovos"] },
  ],
  snack: [
    { text: "Iogurte natural com fruta", styles: animal, contains: ["leite"] },
    { text: "Fruta com castanhas", styles: all },
    { text: "Pão integral com homus", styles: all },
    { text: "Vitamina de banana com bebida vegetal", styles: all },
  ],
  dinner: [
    { text: "Omelete com legumes e mandioca", styles: animal, contains: ["ovos"] },
    { text: "Macarrão integral com grão-de-bico e tomate", styles: all },
    { text: "Arroz, feijão, legumes e proteína de soja", styles: all },
    { text: "Frango, batata e salada", styles: ["onivora"] },
  ],
  supper: [
    { text: "Leite ou iogurte e fruta", styles: animal, contains: ["leite"] },
    { text: "Fruta da estação", styles: all },
    { text: "Aveia com bebida vegetal e canela", styles: all },
  ],
};

const labels: Record<Slot, string> = { breakfast: "Café da manhã", lunch: "Almoço", snack: "Lanche", dinner: "Jantar", supper: "Ceia" };

export function buildMealPlan(style: DietStyle, meals: number, variant: number, avoid: Avoid[]) {
  const slots: Slot[] = meals === 3 ? ["breakfast", "lunch", "dinner"] : meals === 4 ? ["breakfast", "lunch", "snack", "dinner"] : ["breakfast", "lunch", "snack", "dinner", "supper"];
  return slots.map((slot, index) => {
    const matches = ideas[slot].filter(idea => idea.styles.includes(style) && !(idea.contains || []).some(item => avoid.includes(item)));
    return { label: labels[slot], text: matches[(variant + index) % matches.length].text };
  });
}
