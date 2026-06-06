package sports.apparel.backend.service;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sports.apparel.backend.dto.LoginRequest;
import sports.apparel.backend.dto.LoginResponse;
import sports.apparel.backend.dto.UserDTO;
import sports.apparel.backend.entity.User;
import sports.apparel.backend.repository.UserRepository;
import sports.apparel.backend.security.JwtProvider;

import java.util.ArrayList;
import java.util.Collection;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtProvider jwtProvider;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository,
                       JwtProvider jwtProvider,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.jwtProvider = jwtProvider;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public LoginResponse login(LoginRequest loginRequest) {
        User user = userRepository.findByEmailIgnoreCase(loginRequest.getEmail().trim())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        String rawPassword = loginRequest.getPassword();
        String storedPassword = user.getPassword();

        boolean matches = passwordEncoder.matches(rawPassword, storedPassword);
        boolean legacyPlaintextMatch = storedPassword != null && storedPassword.equals(rawPassword);

        if (!matches && !legacyPlaintextMatch) {
            throw new BadCredentialsException("Invalid email or password");
        }

        if (legacyPlaintextMatch) {
            user.setPassword(passwordEncoder.encode(rawPassword));
            userRepository.save(user);
        }

        UserDetails userDetails = buildUserDetails(user);
        String token = jwtProvider.generateToken(userDetails);
        UserDTO userDTO = new UserDTO(user);

        return new LoginResponse(token, userDTO);
    }

    private UserDetails buildUserDetails(User user) {
        Collection<SimpleGrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));

        if (user.getPermissions() != null) {
            user.getPermissions().forEach(permission ->
                    authorities.add(new SimpleGrantedAuthority(permission.getPageName()))
            );
        }

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                authorities
        );
    }
}
