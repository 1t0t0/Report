'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NeoButton from '@/components/ui/NotionButton';
import NeoCard from '@/components/ui/NotionCard';
import { getSession } from 'next-auth/react';
import { TbBus } from "react-icons/tb";


export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // app/login/page.tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    console.log('Login result:', result); // เพิ่ม log

    if (result?.error) {
      setError(result.error);
    } else {
      // Get session to check role
      const session = await getSession();
      console.log('Session after login:', session); // เพิ่ม log
      
      if (session?.user?.role === 'driver') {
        router.push('/driver-portal');
      } else {
        router.push('/dashboard');
      }
    }
  } catch (error) {
    console.error('Login error:', error);
    setError('An error occurred');
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#5294ff] p-4">
      <NeoCard className="w-full max-w-md p-8">
        <h1 className="text-4xl font-black text-center mb-2">ຍິນດີຕ້ອນຮັບ</h1>
        <div className='flex justify-center mb-4'>
        <TbBus className='top-[20rem] text-8xl opacity-80' />
        </div>
        <h2 className="text-2xl font-bold text-center mb-8">ລະບົບອອກປີ້ລົດຕູ້ໂດຍສານ<br/>ປະຈຳທາງລົດໄຟ ລາວ-ຈີນ</h2>
        
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="text-red-500 text-center font-bold">{error}</div>
          )}
          
          <div>
            <label className="block text-sm font-bold mb-2">ອີເມວ</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin@busticketing.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold mb-2">ລະຫັດ</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="********"
              required
            />
          </div>
          
          <NeoButton type="submit" className="w-full">
            ເຂົ້າສູ່ລະບົບ
          </NeoButton>
        </form>

        <div className="mt-6 text-sm text-center">
          <p className="font-bold">DEMO ACCOUNTS:</p>
          <p>admin@busticketing.com</p>
          <p>Password: password123</p>
        </div>
      </NeoCard>
    </div>
  );
}