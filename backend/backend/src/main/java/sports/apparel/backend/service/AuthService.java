package sports.apparel.backend.service;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sports.apparel.backend.dto.LoginRequest;
import sports.apparel.backend.dto.LoginResponse;
import sports.apparel.backend.dto.UserDTO;
import sports.apparel.backend.entity.User;
import sports.apparel.backend.repository.UserRepository;
import sports.apparel.backend.security.JwtProvider;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtProvider jwtProvider;
    private final UserDetailsService userDetailsService;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository,
                       JwtProvider jwtProvider,
                       UserDetailsService userDetailsService,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.jwtProvider = jwtProvider;
        this.userDetailsService = userDetailsService;
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

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtProvider.generateToken(userDetails);
        UserDTO userDTO = new UserDTO(user);

        return new LoginResponse(token, userDTO);
    }
}
