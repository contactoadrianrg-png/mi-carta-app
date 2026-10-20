export async function loadPublicMenu(client, slug) {
  const { data: restaurant, error } = await client.from('restaurants')
    .select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  if (!restaurant || restaurant.active === false) {
    return { restaurant, categories: [], dishes: [] }
  }
  const [categories, dishes] = await Promise.all([
    client.from('categories').select('*').eq('restaurant_id', restaurant.id).order('sort_order'),
    client.from('dishes').select('*').eq('restaurant_id', restaurant.id)
      .eq('available', true).order('sort_order'),
  ])
  if (categories.error) throw categories.error
  if (dishes.error) throw dishes.error
  return { restaurant, categories: categories.data ?? [], dishes: dishes.data ?? [] }
}

export function categoryFamilyIds(categories, categoryId) {
  const ids = new Set([categoryId])
  const pending = [categoryId]
  while (pending.length) {
    const parentId = pending.pop()
    for (const category of categories) {
      if (category.parent_id === parentId && !ids.has(category.id)) {
        ids.add(category.id)
        pending.push(category.id)
      }
    }
  }
  return ids
}

export function filterMenuDishes(dishes, categories, categoryId) {
  if (categoryId === null) return dishes
  const ids = categoryFamilyIds(categories, categoryId)
  return dishes.filter(dish => ids.has(dish.category_id))
}

export function visibleMenuCategories(categories, dishes) {
  return categories.filter(category => !category.parent_id)
    .filter(category => filterMenuDishes(dishes, categories, category.id).length > 0)
}
