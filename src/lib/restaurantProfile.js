export function restaurantProfileUpdates({ name, description, phone, address }) {
  return {
    name: name.trim(),
    description: description.trim(),
    social_phone: phone.trim() || null,
    address: address.trim() || null,
  }
}
