'use client';
import { useApp } from '@/context/StoreProvider';
import Login from '@/components/shop/Login';

export default function LoginPage() { useApp(); return <Login />; }
