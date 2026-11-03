import "server-only";

const BLOCO = 1000;

/**
 * O Supabase corta em 1000 linhas sem avisar. Esta função busca em blocos com
 * `.range()` até acabar. `consulta(de, ate)` deve devolver a query já ordenada.
 */
export async function buscarTodos<T>(
  consulta: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const todos: T[] = [];
  for (let de = 0; ; de += BLOCO) {
    const { data, error } = await consulta(de, de + BLOCO - 1);
    if (error) throw new Error(error.message);
    todos.push(...(data ?? []));
    if (!data || data.length < BLOCO) return todos;
  }
}
