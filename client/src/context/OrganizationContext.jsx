// src/context/OrganizationContext.jsx
import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOrganization } from '../api/organization';

const OrganizationContext = createContext({
  organization: null,
  logo: null,
  name: 'Katuwal Bansha',
  isLoading: false,
  refetch: () => {},
});

export const OrganizationProvider = ({ children }) => {
  const { data: organization, isLoading, refetch } = useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      try {
        const data = await getOrganization();
        return data || { name: 'Katuwal Bansha', logo: null };
      } catch {
        return { name: 'Katuwal Bansha', logo: null };
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const value = {
    organization,
    logo: organization?.logo || null,
    name: organization?.name || 'Katuwal Bansha',
    isLoading,
    refetch,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => useContext(OrganizationContext);
