package sports.apparel.backend.features.users;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sports.apparel.backend.entity.User;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostConstruct
    public void reportDuplicateUsernames() {
        try {
            Map<String, List<User>> grouped = userRepository.findAll().stream()
                    .filter(user -> user.getUsername() != null)
                    .collect(Collectors.groupingBy(
                            user -> normalizeUsername(user.getUsername()).toLowerCase(),
                            LinkedHashMap::new,
                            Collectors.toList()));

            grouped.forEach((normalized, users) -> {
                if (users.size() > 1) {
                    String names = users.stream()
                            .map(user -> String.format("%s (%s)", user.getUsername(), user.getId()))
                            .collect(Collectors.joining(", "));
                    log.warn("Duplicate employee name detected for '{}': {} - resolve manually before enabling the unique index.",
                            normalized, names);
                }
            });
        } catch (Exception exception) {
            log.warn("Could not scan for duplicate employee names: {}", exception.getMessage());
        }
    }

    public UserDTO createUser(CreateUserRequest request) {
        String normalizedUsername = normalizeUsername(request.getUsername());
        if (normalizedUsername == null || normalizedUsername.isBlank()) {
            throw new IllegalArgumentException("Username is required");
        }
        if (userRepository.existsByNormalizedUsername(normalizedUsername)) {
            throw new IllegalArgumentException("An employee with a similar name already exists");
        }
        if (request.getRole() == null || request.getRole().isBlank()) {
            throw new IllegalArgumentException("Role is required");
        }

        User.Role role;
        try {
            role = parseRole(request.getRole());
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException("Invalid role selected");
        }

        boolean isAdmin = role == User.Role.ADMIN;
        String email = request.getEmail() == null ? null : request.getEmail().trim();
        String password = request.getPassword() == null ? null : request.getPassword().trim();

        if (isAdmin) {
            if (email == null || email.isBlank()) {
                throw new IllegalArgumentException("Email is required for admin accounts");
            }
            if (password == null || password.isBlank()) {
                throw new IllegalArgumentException("Password is required for admin accounts");
            }
        }

        if (email != null && !email.isBlank() && userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already exists");
        }

        User user = new User();
        user.setUsername(normalizedUsername);
        user.setEmail((email == null || email.isBlank()) ? null : email);
        if (password != null && !password.isBlank()) {
            user.setPassword(passwordEncoder.encode(password));
        } else {
            user.setPassword(null);
        }
        user.setRole(role);
        user.setSalary(request.getSalary());
        applyAdditionalRoles(user, request.getAdditionalRoles(), role);

        User savedUser = userRepository.save(user);
        return new UserDTO(savedUser);
    }

    public UserDTO getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return new UserDTO(user);
    }

    public UserDTO getUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return new UserDTO(user);
    }

    public Page<UserDTO> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable)
                .map(UserDTO::new);
    }

    public UserDTO updateUser(UUID id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (request.getUsername() != null && !request.getUsername().equals(user.getUsername())) {
            String normalizedUsername = normalizeUsername(request.getUsername());
            if (normalizedUsername == null || normalizedUsername.isBlank()) {
                throw new IllegalArgumentException("Username is required");
            }
            boolean duplicate = userRepository.findByNormalizedUsername(normalizedUsername).stream()
                    .anyMatch(existing -> !existing.getId().equals(user.getId()));
            if (duplicate) {
                throw new IllegalArgumentException("An employee with a similar name already exists");
            }
            user.setUsername(normalizedUsername);
        }

        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new IllegalArgumentException("Email already exists");
            }
            user.setEmail(request.getEmail());
        }

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        if (request.getRole() != null) {
            try {
                user.setRole(parseRole(request.getRole()));
            } catch (IllegalArgumentException error) {
                throw new IllegalArgumentException("Invalid role selected");
            }
        }

        if (request.getSalary() != null) {
            user.setSalary(request.getSalary());
        }

        if (request.getAdditionalRoles() != null) {
            applyAdditionalRoles(user, request.getAdditionalRoles(), user.getRole());
        }

        User updatedUser = userRepository.save(user);
        return new UserDTO(updatedUser);
    }

    private String normalizeUsername(String username) {
        if (username == null) {
            return null;
        }
        return username.trim().replaceAll("\\s+", " ");
    }

    private User.Role parseRole(String rawRole) {
        String normalized = rawRole.trim().toUpperCase().replaceAll("[\\s-]+", "_");
        if (normalized.equals("GRAPHIC") || normalized.equals("GRAPHIC_ARTIST") || normalized.equals("GRAPHIC_ARTISTS")) {
            return User.Role.GRAPHIC_ARTISTS;
        }
        if (normalized.equals("MACHINE") || normalized.equals("MACHINE_OPERATOR") || normalized.equals("MACHINE_OPERATORS")) {
            return User.Role.MACHINE_OPERATORS;
        }
        return User.Role.valueOf(normalized);
    }

    private void applyAdditionalRoles(User user, java.util.List<String> additionalRoles, User.Role primaryRole) {
        user.getAdditionalRoles().clear();
        if (additionalRoles == null) {
            return;
        }
        java.util.LinkedHashSet<User.Role> seen = new java.util.LinkedHashSet<>();
        for (String rawRole : additionalRoles) {
            if (rawRole == null || rawRole.isBlank()) {
                continue;
            }
            User.Role extraRole;
            try {
                extraRole = parseRole(rawRole);
            } catch (IllegalArgumentException error) {
                throw new IllegalArgumentException("Invalid additional role selected: " + rawRole);
            }
            if (extraRole == primaryRole || !seen.add(extraRole)) {
                continue;
            }
            user.getAdditionalRoles().add(new sports.apparel.backend.entity.UserRole(user, extraRole));
        }
    }

    public java.util.List<EmployeeOptionDTO> getGraphicArtists() {
        return userRepository.findByRoleIncludingAdditional(User.Role.GRAPHIC_ARTISTS).stream()
                .filter(user -> user.getUsername() != null && !user.getUsername().isBlank())
                .map(EmployeeOptionDTO::new)
                .toList();
    }

    public void deleteUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        userRepository.delete(user);
    }
}
