import React from 'react';
import styles from './Header.module.css';

const Header = () => (
  <header className={styles.header}>
    <div className={styles.logo}>CodeMemory</div>
    <div className={styles.tagline}>Query your codebase history with AI</div>
  </header>
);

export default Header;
