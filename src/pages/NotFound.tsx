import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div>
      <h1>Page introuvable</h1>
      <Link to="/">Retour à l'accueil</Link>
    </div>
  );
};

export default NotFound;
