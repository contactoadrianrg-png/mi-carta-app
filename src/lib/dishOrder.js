export function moveDish(dishes, sourceId, targetId) {
  const from = dishes.findIndex(dish => dish.id === sourceId)
  const to = dishes.findIndex(dish => dish.id === targetId)
  if (from < 0 || to < 0 || from === to) return dishes
  const next = [...dishes]
  const [dish] = next.splice(from, 1)
  next.splice(to, 0, dish)
  return next
}

export async function nextDishSortOrder(client, restaurantId) {
  const { data, error } = await client.from('dishes').select('sort_order')
    .eq('restaurant_id', restaurantId).order('sort_order', { ascending: false }).limit(1).maybeSingle()
  if (error) throw error
  return data ? Number(data.sort_order ?? -1) + 1 : 0
}
