// AppIcon.js

import { Icons } from './icons';

export default function AppIcon({
    name,
    size = 20,
    color = '#333',
}) {

    const Icon = Icons[name];

    return (
        <Icon
            size={size}
            color={color}
            strokeWidth={2}
        />
    );
}