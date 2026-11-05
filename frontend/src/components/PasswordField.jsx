import { useState } from 'react';
import './PasswordField.css';

export default function PasswordField({ name, value, onChange, placeholder }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        type={visible ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
      />
      <span onClick={() => setVisible((v) => !v)} className="eye">
        {visible ? '🙈' : '👁️'}
      </span>
    </div>
  );
}