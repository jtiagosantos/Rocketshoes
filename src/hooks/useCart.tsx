import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data } = await api.get<Product>(`/products/${productId}`);

      const product = cart.filter((product) => product.id === productId)[0];
      const productExistsInCart = product ? true : false;

      if(productExistsInCart) {
        const { data: stockProduct } = await api.get<Stock>(`/stock/${productId}`);

        if(product.amount + 1 <= stockProduct.amount) {
          const newCart = cart.filter((product) => {
            if(product.id === productId) {
              return { ...product, amount: product.amount += 1 };
            }

            return product;
          });

          setCart(newCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      } else {
        const newCart = [...cart, { ...data, amount: 1 }];
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      }
      
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter((product) => product.id !== productId);
      
      if(newCart.length === cart.length) {
        throw new Error('Erro na remoção do produto'); 
      }

      setCart(newCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch(error: any) {
      toast.error(`${error.message}`);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount < 1) return;

      const { data: stockProduct } = await api.get<Stock>(`/stock/${productId}`);

      if(amount <= stockProduct.amount) {
        const newCart = cart.filter((product) => {
          if(product.id === productId) {
            return product.amount = amount;
          }

          return product;
        });

        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }   
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
