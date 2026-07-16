import assert from 'node:assert/strict';
import { formatDimensionsSummary, parseDimensionFile } from '../utils/parser';

function expectSuccess(content: string, mimeType = 'text/csv') {
  const result = parseDimensionFile(content, mimeType);
  assert.equal(result.success, true, result.errors?.join('\n') ?? 'Expected parse success');
  assert.ok(result.dimensions, 'Expected parsed dimensions');
  return result.dimensions;
}

{
  const dimensions = expectSuccess(`field,value,unit
length,120,cm
width,60,cm
height,75,cm
top_thickness,4,cm
leg_thickness,5,cm
leg_style,round,
`);

  assert.deepEqual(dimensions, {
    length_cm: 120,
    width_cm: 60,
    height_cm: 75,
    top_thickness_cm: 4,
    leg_thickness_cm: 5,
    leg_style: 'round',
  });
}

{
  const dimensions = expectSuccess(`length,width,height,top_thickness,leg_thickness,leg_style
120cm,600mm,30in,0.04m,2in,square
`);

  assert.equal(dimensions.length_cm, 120);
  assert.equal(dimensions.width_cm, 60);
  assert.equal(dimensions.height_cm, 76.2);
  assert.equal(dimensions.top_thickness_cm, 4);
  assert.equal(dimensions.leg_thickness_cm, 5.08);
  assert.equal(dimensions.leg_style, 'square');
}

{
  const dimensions = expectSuccess(
    JSON.stringify({
      dimensions: {
        length_m: 1.2,
        width_mm: 600,
        height: '75cm',
        top_thickness: '4cm',
        leg_thickness: '5cm',
        leg_style: 'round',
      },
    }),
    'application/json'
  );

  assert.equal(dimensions.length_cm, 120);
  assert.equal(dimensions.width_cm, 60);
  assert.equal(dimensions.height_cm, 75);
  assert.equal(dimensions.leg_style, 'round');
}

{
  const result = parseDimensionFile(`field,value,unit
length,120,cm
height,75,cm
`, 'text/csv');

  assert.equal(result.success, false);
  assert.ok(result.errors?.some((error) => error.includes('width')));
}

{
  const dimensions = expectSuccess(`field,value,unit
length,120,cm
width,60,cm
height,75,cm
`);

  assert.equal(formatDimensionsSummary(dimensions), 'L 120cm x W 60cm x H 75cm');
}

console.log('parser tests passed');
