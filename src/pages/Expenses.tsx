import { useState, useEffect } from "react"; 
import { supabase } from "@/integrations/supabase/client"; 
import { useAuth } from "@/contexts/AuthContext"; 
import { toast } from "sonner"; 

const Expenses = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]); 
  const [loading, setLoading] = useState(true); 
 
  useEffect(() => { 
    if (!user) return; 
    const load = async () => { 
      setLoading(true); 
      try { 
        const { data, error } = await supabase 
          .from('expenses') 
          .select('*') 
          .order('created_at', { ascending: false }); 
        if (error) throw error; 
        setExpenses(data ?? []); 
      } catch(e) { 
        setExpenses([]); 
        toast.error('Failed to load expenses'); 
      } finally { 
        setLoading(false); 
      } 
    }; 
    load(); 
  }, [user]); 
 
  if (loading) return <div>Loading...</div> 
  return <div>Expenses page - {expenses.length} found</div> 
};

export default Expenses;
