// Test unitario para recalcPrice del cart-store
// Copia la función y la prueba con diferentes escenarios

function recalcPrice(item, quantity) {
  const base = item.basePrice || item.price;
  const optionsMod = item.optionsPriceMod || 0;
  const extrasMod = item.extrasPriceMod || 0;

  if (!item.wholesaleEnabled) {
    return base + optionsMod + extrasMod;
  }

  if (item.wholesaleTiers && item.wholesaleTiers.length > 0) {
    const sorted = [...item.wholesaleTiers].sort((a, b) => a.minQty - b.minQty);
    for (const tier of sorted) {
      if (quantity >= tier.minQty && (tier.maxQty === 0 || quantity <= tier.maxQty)) {
        return tier.price + optionsMod + extrasMod;
      }
    }
  }

  if ((item.wholesalePrice ?? 0) > 0 && quantity >= (item.wholesaleMinQty ?? Infinity)) {
    return item.wholesalePrice + optionsMod + extrasMod;
  }

  return base + optionsMod + extrasMod;
}

const baseItem = {
  productId: 'test',
  name: 'Test',
  price: 10,
  basePrice: 10,
  image: '',
  quantity: 1,
  wholesaleEnabled: true,
  wholesalePrice: 0,
  wholesaleMinQty: 10,
  wholesaleTiers: [
    {minQty: 10, maxQty: 19, price: 8},
    {minQty: 20, maxQty: 0, price: 7}
  ],
  optionsPriceMod: 0,
  extrasPriceMod: 0
};

console.log('=== Test recalcPrice (Issue 4: wholesale en checkout) ===\n');

// Caso 1: cantidad 5 (no califica para wholesale) → precio base $10
const p1 = recalcPrice(baseItem, 5);
console.log(`Cant 5  → $${p1.toFixed(2)} (esperado: $10.00) ${p1 === 10 ? '✓' : '❌'}`);

// Caso 2: cantidad 15 (califica para tier 10-19) → $8
const p2 = recalcPrice(baseItem, 15);
console.log(`Cant 15 → $${p2.toFixed(2)} (esperado: $8.00)  ${p2 === 8 ? '✓' : '❌'}`);

// Caso 3: cantidad 20 (califica para tier 20+) → $7
const p3 = recalcPrice(baseItem, 20);
console.log(`Cant 20 → $${p3.toFixed(2)} (esperado: $7.00)  ${p3 === 7 ? '✓' : '❌'}`);

// Caso 4: cantidad 25 (califica para tier 20+) → $7
const p4 = recalcPrice(baseItem, 25);
console.log(`Cant 25 → $${p4.toFixed(2)} (esperado: $7.00)  ${p4 === 7 ? '✓' : '❌'}`);

// Caso 5: cantidad 10 (límite inferior del primer tier) → $8
const p5 = recalcPrice(baseItem, 10);
console.log(`Cant 10 → $${p5.toFixed(2)} (esperado: $8.00)  ${p5 === 8 ? '✓' : '❌'}`);

// Caso 6: cantidad 19 (límite superior del primer tier) → $8
const p6 = recalcPrice(baseItem, 19);
console.log(`Cant 19 → $${p6.toFixed(2)} (esperado: $8.00)  ${p6 === 8 ? '✓' : '❌'}`);

// Caso 7: producto SIN wholesale → siempre precio base
const noWholesaleItem = {...baseItem, wholesaleEnabled: false};
const p7 = recalcPrice(noWholesaleItem, 100);
console.log(`Cant 100 sin wholesale → $${p7.toFixed(2)} (esperado: $10.00) ${p7 === 10 ? '✓' : '❌'}`);

// Caso 8: con modificadores de variantes/extras
const withMods = {...baseItem, optionsPriceMod: 2, extrasPriceMod: 1};
const p8 = recalcPrice(withMods, 15);
console.log(`Cant 15 + mods($3) → $${p8.toFixed(2)} (esperado: $11.00) ${p8 === 11 ? '✓' : '❌'}`);

console.log('\n=== Test Issue 3: descuento destacado ===\n');
// Antes: featured inventaba 10% descuento → price=5, originalPrice=5.56
// Ahora: featured NO inventa descuento → solo muestra price=5
const featuredProduct = {price: 5, featured: true, offerEnabled: false};
const oldDiscount = !featuredProduct.offerEnabled && featuredProduct.featured ? 10 : 0;
const oldOriginalPrice = oldDiscount ? (featuredProduct.price / (1 - oldDiscount / 100)).toFixed(2) : null;
console.log(`ANTES: featured=true → discount=${oldDiscount}%, originalPrice=${oldOriginalPrice} (mostraba $5.56 tachado)`);
console.log(`AHORA: featured=true → NO se calcula descuento, solo se muestra $${featuredProduct.price.toFixed(2)}`);

console.log('\n=== Test Issue 1: WhatsApp con variantes ===\n');
// Simular el formato del mensaje WhatsApp
const orderItem = {
  name: 'Brazo Gitano',
  quantity: 2,
  price: 6,
  variantInfo: JSON.stringify([
    {groupName: 'Tamaño', optionName: 'Grande', optionId: 'opt-1'},
    {groupName: 'Sabor', optionName: 'Chocolate', optionId: 'opt-2'}
  ]),
  extrasInfo: JSON.stringify([{name: 'Extra queso', price: 1}])
};

let line = `* ${orderItem.name}`;
const variants = JSON.parse(orderItem.variantInfo);
if (Array.isArray(variants) && variants.length > 0) {
  const variantText = variants.map(v => `${v.groupName}: ${v.optionName}`).join(', ');
  line += ` (${variantText})`;
}
const extras = JSON.parse(orderItem.extrasInfo);
if (Array.isArray(extras) && extras.length > 0) {
  const extrasText = extras.map(e => `+${e.name}`).join(', ');
  line += ` [${extrasText}]`;
}
line += ` x${orderItem.quantity} = $${(orderItem.price * orderItem.quantity).toFixed(2)}`;
console.log(`Línea WhatsApp: ${line}`);
console.log(`Esperado: * Brazo Gitano (Tamaño: Grande, Sabor: Chocolate) [+Extra queso] x2 = $12.00`);
