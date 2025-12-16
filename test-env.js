// Debug: Verificar se ADMIN_SECRET está sendo lido corretamente
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

console.log('=== DEBUG ADMIN_SECRET ===');
console.log('ADMIN_SECRET existe?', process.env.ADMIN_SECRET !== undefined);
console.log('ADMIN_SECRET valor:', process.env.ADMIN_SECRET);
console.log('ADMIN_SECRET length:', process.env.ADMIN_SECRET?.length);
console.log('ADMIN_SECRET comparação:', process.env.ADMIN_SECRET === '@#Chopuchai.20');
console.log('========================');
